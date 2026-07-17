-- RBC Loan App v6 patch
-- Approved profile photo display + one-time user-level cash-out deposit.
-- Run once in Supabase Dashboard -> SQL Editor before deploying v6 code.

begin;

-- ---------------------------------------------------------------------------
-- 1. Store the user-level deposit amount directly on the approved profile.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists cashout_deposit_amount numeric(14,2) not null default 0,
  add column if not exists cashout_deposit_verified_at timestamptz,
  add column if not exists cashout_deposit_verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists cashout_deposit_admin_note text;

-- V4 treated the separate cash-out deposit as wallet savings. V6 treats it as
-- a separate one-time payment, so safely remove only those legacy savings credits.
with legacy_cashout_deposits as (
  select user_id, coalesce(sum(amount), 0) as amount
  from public.transactions
  where type = 'cashout_deposit' and status = 'successful'
  group by user_id
)
update public.user_wallets w
set total_deposit = greatest(0, w.total_deposit - l.amount),
    updated_at = now()
from legacy_cashout_deposits l
where w.user_id = l.user_id;

delete from public.transactions
where type = 'cashout_deposit';

-- Preserve the latest useful deposit amount from the old per-loan workflow.
with ranked_amounts as (
  select distinct on (user_id)
    user_id,
    coalesce(deposit_amount, 0) as deposit_amount,
    status,
    verified_at,
    verified_by,
    admin_note
  from public.cashout_deposit_requests
  where coalesce(deposit_amount, 0) > 0
  order by user_id, (status = 'verified') desc, updated_at desc
)
update public.profiles p
set cashout_deposit_amount = case
      when p.cashout_deposit_amount > 0 then p.cashout_deposit_amount
      else r.deposit_amount
    end,
    cashout_deposit_verified_at = case
      when r.status = 'verified' then coalesce(p.cashout_deposit_verified_at, r.verified_at, now())
      else p.cashout_deposit_verified_at
    end,
    cashout_deposit_verified_by = case
      when r.status = 'verified' then coalesce(p.cashout_deposit_verified_by, r.verified_by)
      else p.cashout_deposit_verified_by
    end,
    cashout_deposit_admin_note = coalesce(p.cashout_deposit_admin_note, r.admin_note),
    updated_at = now()
from ranked_amounts r
where p.id = r.user_id;

-- ---------------------------------------------------------------------------
-- 2. One deposit record per user. This deposit is paid separately and is
--    required only once before the first cash-out.
-- ---------------------------------------------------------------------------
create table if not exists public.user_cashout_deposits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted','verified','payment_rejected')),
  payment_method text,
  receiver_reference text,
  transaction_id text,
  payment_screenshot_path text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_cashout_deposits_status_idx
on public.user_cashout_deposits(status, updated_at desc);

drop trigger if exists set_user_cashout_deposits_updated_at on public.user_cashout_deposits;
create trigger set_user_cashout_deposits_updated_at
before update on public.user_cashout_deposits
for each row execute function public.set_updated_at();

-- Migrate the best existing per-loan deposit record to the new one-time table.
with ranked_requests as (
  select distinct on (user_id)
    user_id,
    case
      when status = 'verified' then 'verified'
      when status = 'submitted' then 'submitted'
      when status = 'payment_rejected' then 'payment_rejected'
      else null
    end as mapped_status,
    payment_method,
    receiver_reference,
    transaction_id,
    payment_screenshot_path,
    verified_by,
    verified_at,
    admin_note,
    created_at,
    updated_at
  from public.cashout_deposit_requests
  order by user_id, (status = 'verified') desc, updated_at desc
)
insert into public.user_cashout_deposits (
  user_id, status, payment_method, receiver_reference, transaction_id,
  payment_screenshot_path, verified_by, verified_at, admin_note, created_at, updated_at
)
select
  user_id, mapped_status, payment_method, receiver_reference, transaction_id,
  payment_screenshot_path, verified_by, verified_at, admin_note, created_at, updated_at
from ranked_requests
where mapped_status is not null
on conflict (user_id) do update set
  status = excluded.status,
  payment_method = excluded.payment_method,
  receiver_reference = excluded.receiver_reference,
  transaction_id = excluded.transaction_id,
  payment_screenshot_path = excluded.payment_screenshot_path,
  verified_by = excluded.verified_by,
  verified_at = excluded.verified_at,
  admin_note = excluded.admin_note,
  updated_at = greatest(public.user_cashout_deposits.updated_at, excluded.updated_at);

-- Keep profile verification fields in sync for migrated verified deposits.
update public.profiles p
set cashout_deposit_verified_at = coalesce(p.cashout_deposit_verified_at, d.verified_at, now()),
    cashout_deposit_verified_by = coalesce(p.cashout_deposit_verified_by, d.verified_by),
    cashout_deposit_admin_note = coalesce(p.cashout_deposit_admin_note, d.admin_note),
    updated_at = now()
from public.user_cashout_deposits d
where d.user_id = p.id and d.status = 'verified';

-- The old request RPCs are no longer used by v6.
drop function if exists public.request_cashout_deposit(uuid);
drop function if exists public.submit_cashout_deposit_payment(uuid,text,text,text,text);

-- ---------------------------------------------------------------------------
-- 3. User submits the one-time deposit payment. The amount always comes from
--    profiles.cashout_deposit_amount and cannot be changed by the user.
-- ---------------------------------------------------------------------------
create or replace function public.submit_user_cashout_deposit_payment(
  p_payment_method text,
  p_receiver_reference text,
  p_transaction_id text,
  p_payment_screenshot_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_admin record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in ('bkash','nagad','rocket','bank') then raise exception 'Invalid payment method'; end if;
  if coalesce(trim(p_transaction_id), '') = '' then raise exception 'Transaction ID is required'; end if;

  select * into v_profile
  from public.profiles
  where id = v_user
  for update;

  if not found then raise exception 'Profile not found'; end if;
  if v_profile.kyc_status <> 'verified' then raise exception 'Your profile must be approved before cash out'; end if;
  if coalesce(v_profile.cashout_deposit_amount, 0) <= 0 then raise exception 'Admin has not set your cash out deposit amount'; end if;
  if v_profile.cashout_deposit_verified_at is not null then raise exception 'Your one-time cash out deposit is already verified'; end if;

  insert into public.user_cashout_deposits (
    user_id, status, payment_method, receiver_reference, transaction_id,
    payment_screenshot_path, verified_by, verified_at, admin_note
  ) values (
    v_user, 'submitted', p_payment_method, nullif(trim(p_receiver_reference), ''), trim(p_transaction_id),
    nullif(trim(p_payment_screenshot_path), ''), null, null, null
  )
  on conflict (user_id) do update set
    status = 'submitted',
    payment_method = excluded.payment_method,
    receiver_reference = excluded.receiver_reference,
    transaction_id = excluded.transaction_id,
    payment_screenshot_path = excluded.payment_screenshot_path,
    verified_by = null,
    verified_at = null,
    admin_note = null,
    updated_at = now();

  insert into public.app_notifications(user_id, type, title, message, action_url)
  values(
    v_user,
    'cashout_deposit_payment_submitted',
    'Deposit payment submitted',
    'Your one-time cash out deposit payment is waiting for admin verification.',
    '/loan/cashout'
  );

  for v_admin in
    select id from public.profiles
    where role in ('admin','super_admin') and status = 'active'
  loop
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    values(
      v_admin.id,
      'admin_cashout_deposit_payment_submitted',
      'One-time cash out deposit submitted',
      coalesce(v_profile.full_name, v_profile.email, 'A user') || ' submitted the cash out deposit payment for verification.',
      '/admin/cashout-deposits',
      jsonb_build_object('user_id', v_user, 'deposit_amount', v_profile.cashout_deposit_amount)
    );
  end loop;
end;
$$;

revoke all on function public.submit_user_cashout_deposit_payment(text,text,text,text) from public;
grant execute on function public.submit_user_cashout_deposit_payment(text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Protect admin-owned profile deposit fields from normal users.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'Protected profile fields cannot be changed by a user';
    end if;

    if new.cashout_deposit_amount is distinct from old.cashout_deposit_amount
       or new.cashout_deposit_verified_at is distinct from old.cashout_deposit_verified_at
       or new.cashout_deposit_verified_by is distinct from old.cashout_deposit_verified_by
       or new.cashout_deposit_admin_note is distinct from old.cashout_deposit_admin_note then
      raise exception 'Cash out deposit settings can only be changed by an admin';
    end if;

    if new.kyc_status is distinct from old.kyc_status then
      if old.kyc_status not in ('not_submitted','rejected') or new.kyc_status <> 'submitted' then
        raise exception 'Invalid KYC status transition';
      end if;
    end if;

    new.kyc_verified_at := old.kyc_verified_at;
    if new.kyc_status = 'submitted' then
      new.kyc_rejection_reason := null;
    else
      new.kyc_rejection_reason := old.kyc_rejection_reason;
    end if;
  end if;
  return new;
end;
$$;

-- Trigger already exists in v4, recreate it for clean installs and upgrades.
drop trigger if exists protect_profile_review_fields_trigger on public.profiles;
create trigger protect_profile_review_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_review_fields();

-- ---------------------------------------------------------------------------
-- 5. RLS and grants.
-- ---------------------------------------------------------------------------
alter table public.user_cashout_deposits enable row level security;

drop policy if exists "user_cashout_deposits_select" on public.user_cashout_deposits;
drop policy if exists "user_cashout_deposits_admin_update" on public.user_cashout_deposits;
create policy "user_cashout_deposits_select" on public.user_cashout_deposits
for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "user_cashout_deposits_admin_update" on public.user_cashout_deposits
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.user_cashout_deposits from authenticated;
grant select on public.user_cashout_deposits to authenticated;
grant update(status,verified_by,verified_at,admin_note,updated_at) on public.user_cashout_deposits to authenticated;

grant update(
  full_name,phone,preferred_locale,country,city,address,date_of_birth,gender,
  passport_number,nid_number,profile_photo_path,nid_front_path,nid_back_path,
  kyc_status,kyc_rejection_reason,kyc_verified_at,
  cashout_deposit_amount,cashout_deposit_verified_at,cashout_deposit_verified_by,
  cashout_deposit_admin_note,updated_at
) on public.profiles to authenticated;

commit;
