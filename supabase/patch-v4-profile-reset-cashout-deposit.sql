-- RBC Loan App v4 patch
-- Profile approval workflow + separate admin-set cash out deposit workflow.
-- Run once in Supabase Dashboard -> SQL Editor before deploying v4 code.

begin;

-- ---------------------------------------------------------------------------
-- 1. Reverse v3 automatic loan-balance deductions safely.
-- Only records explicitly created by the v3 automatic deduction flow are touched.
-- ---------------------------------------------------------------------------
with auto_deposits as (
  select user_id, coalesce(sum(amount), 0) as amount
  from public.loan_deposits
  where payment_method = 'loan_balance_deduction' and status = 'verified'
  group by user_id
)
update public.user_wallets w
set available_balance = w.available_balance + a.amount,
    total_deposit = greatest(0, w.total_deposit - a.amount),
    updated_at = now()
from auto_deposits a
where w.user_id = a.user_id;

delete from public.transactions
where type = 'fixed_deposit_deduction' and payment_method = 'loan_balance_deduction';

delete from public.app_notifications
where type = 'fixed_deposit_reserved';

delete from public.loan_deposits
where payment_method = 'loan_balance_deduction';

drop index if exists public.loan_deposits_one_auto_deduction_per_loan_idx;
drop function if exists public.prepare_cashout_fixed_deposit(uuid);

-- ---------------------------------------------------------------------------
-- 2. Cash out deposit request workflow.
-- Deposit is paid separately and never reduces approved loan / wallet balance.
-- ---------------------------------------------------------------------------
create table if not exists public.cashout_deposit_requests (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_amount numeric(14,2),
  status text not null default 'requested' check (status in ('requested','approved','submitted','verified','payment_rejected','rejected')),
  payment_method text,
  receiver_reference text,
  transaction_id text,
  payment_screenshot_path text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashout_deposit_requests_user_status_idx
on public.cashout_deposit_requests(user_id, status);

drop trigger if exists set_cashout_deposit_requests_updated_at on public.cashout_deposit_requests;
create trigger set_cashout_deposit_requests_updated_at
before update on public.cashout_deposit_requests
for each row execute function public.set_updated_at();

create or replace function public.request_cashout_deposit(p_loan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_loan public.loan_applications%rowtype;
  v_request_id uuid;
  v_admin record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_loan from public.loan_applications
  where id = p_loan_id and user_id = v_user;

  if not found then raise exception 'Loan not found'; end if;
  if v_loan.status not in ('approved','cashout_requested','cashout_completed','running') then
    raise exception 'Loan is not eligible for cash out';
  end if;

  insert into public.cashout_deposit_requests(loan_application_id, user_id, status)
  values(p_loan_id, v_user, 'requested')
  on conflict(loan_application_id) do update
    set status = case
      when public.cashout_deposit_requests.status in ('rejected') then 'requested'
      else public.cashout_deposit_requests.status
    end,
    admin_note = case
      when public.cashout_deposit_requests.status in ('rejected') then null
      else public.cashout_deposit_requests.admin_note
    end,
    updated_at = now()
  returning id into v_request_id;

  insert into public.app_notifications(user_id, type, title, message, action_url)
  values(v_user, 'cashout_deposit_requested', 'Deposit request sent', 'Your deposit amount request was sent to an admin.', '/loan/cashout?loan=' || p_loan_id::text);

  for v_admin in select id from public.profiles where role in ('admin','super_admin') and status = 'active'
  loop
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    values(v_admin.id, 'admin_cashout_deposit_requested', 'New cash out deposit request', coalesce(v_loan.application_no, 'Loan') || ' needs a deposit amount.', '/admin/cashout-deposits', jsonb_build_object('request_id', v_request_id, 'loan_id', p_loan_id, 'requested_by', v_user));
  end loop;

  return v_request_id;
end;
$$;

revoke all on function public.request_cashout_deposit(uuid) from public;
grant execute on function public.request_cashout_deposit(uuid) to authenticated;

create or replace function public.submit_cashout_deposit_payment(
  p_request_id uuid,
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
  v_request public.cashout_deposit_requests%rowtype;
  v_admin record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in ('bkash','nagad','rocket','bank') then raise exception 'Invalid payment method'; end if;
  if coalesce(trim(p_transaction_id), '') = '' then raise exception 'Transaction ID is required'; end if;

  select * into v_request from public.cashout_deposit_requests
  where id = p_request_id and user_id = v_user
  for update;

  if not found then raise exception 'Deposit request not found'; end if;
  if v_request.status not in ('approved','payment_rejected') then raise exception 'Deposit payment cannot be submitted in the current status'; end if;
  if coalesce(v_request.deposit_amount, 0) <= 0 then raise exception 'Admin has not set the deposit amount'; end if;

  update public.cashout_deposit_requests
  set status = 'submitted',
      payment_method = p_payment_method,
      receiver_reference = nullif(trim(p_receiver_reference), ''),
      transaction_id = trim(p_transaction_id),
      payment_screenshot_path = nullif(trim(p_payment_screenshot_path), ''),
      admin_note = null,
      updated_at = now()
  where id = p_request_id;

  insert into public.app_notifications(user_id, type, title, message, action_url)
  values(v_user, 'cashout_deposit_payment_submitted', 'Deposit payment submitted', 'Your separate deposit payment is waiting for admin verification.', '/loan/cashout?loan=' || v_request.loan_application_id::text);

  for v_admin in select id from public.profiles where role in ('admin','super_admin') and status = 'active'
  loop
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    values(v_admin.id, 'admin_cashout_deposit_payment_submitted', 'Deposit payment submitted', 'A user submitted a cash out deposit payment for verification.', '/admin/cashout-deposits', jsonb_build_object('request_id', p_request_id, 'loan_id', v_request.loan_application_id, 'submitted_by', v_user));
  end loop;
end;
$$;

revoke all on function public.submit_cashout_deposit_payment(uuid,text,text,text,text) from public;
grant execute on function public.submit_cashout_deposit_payment(uuid,text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Profile review protection + admin notification.
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

drop trigger if exists protect_profile_review_fields_trigger on public.profiles;
create trigger protect_profile_review_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_review_fields();

create or replace function public.notify_admins_profile_submission()
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
  select * into v_profile from public.profiles where id = v_user;
  if not found or v_profile.kyc_status <> 'submitted' then raise exception 'Submitted profile not found'; end if;

  for v_admin in select id from public.profiles where role in ('admin','super_admin') and status = 'active'
  loop
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    values(v_admin.id, 'admin_profile_submitted', 'Profile submitted for approval', coalesce(v_profile.full_name, v_profile.email, 'A user') || ' submitted profile and KYC information.', '/admin/profiles', jsonb_build_object('profile_id', v_user));
  end loop;
end;
$$;

revoke all on function public.notify_admins_profile_submission() from public;
grant execute on function public.notify_admins_profile_submission() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS / grants for new workflow and admin profile review columns.
-- ---------------------------------------------------------------------------
alter table public.cashout_deposit_requests enable row level security;

drop policy if exists "cashout_deposit_requests_select" on public.cashout_deposit_requests;
drop policy if exists "cashout_deposit_requests_admin_update" on public.cashout_deposit_requests;
create policy "cashout_deposit_requests_select" on public.cashout_deposit_requests
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "cashout_deposit_requests_admin_update" on public.cashout_deposit_requests
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Table writes by users are done only through the security-definer RPC functions.
revoke insert, update, delete on public.cashout_deposit_requests from authenticated;
grant select on public.cashout_deposit_requests to authenticated;
grant update(deposit_amount,status,payment_method,receiver_reference,transaction_id,payment_screenshot_path,approved_by,approved_at,verified_by,verified_at,admin_note,updated_at) on public.cashout_deposit_requests to authenticated;

-- Existing profile column grants need the admin review columns too.
grant update(full_name,phone,preferred_locale,country,city,address,date_of_birth,gender,passport_number,nid_number,profile_photo_path,nid_front_path,nid_back_path,kyc_status,kyc_rejection_reason,kyc_verified_at,updated_at) on public.profiles to authenticated;

commit;
