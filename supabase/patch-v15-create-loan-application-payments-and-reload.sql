-- V15 emergency repair: create/repair public.loan_application_payments,
-- restore the complete application-fee workflow, and reload PostgREST schema cache.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

create table if not exists public.loan_application_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_amount numeric(14,2) not null check (requested_amount >= 1000),
  expected_amount numeric(14,2) not null check (expected_amount >= 0),
  payment_method text not null check (payment_method in ('bkash','nagad','rocket','bank')),
  receiver_reference text,
  transaction_id text not null,
  payment_screenshot_path text,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected','used')),
  admin_note text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  loan_application_id uuid unique references public.loan_applications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair partially-created tables from an interrupted earlier patch.
alter table public.loan_application_payments
  add column if not exists user_id uuid,
  add column if not exists requested_amount numeric(14,2),
  add column if not exists expected_amount numeric(14,2),
  add column if not exists payment_method text,
  add column if not exists receiver_reference text,
  add column if not exists transaction_id text,
  add column if not exists payment_screenshot_path text,
  add column if not exists status text default 'submitted',
  add column if not exists admin_note text,
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists loan_application_id uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.loan_applications
  add column if not exists application_payment_id uuid;

-- Add missing foreign keys only when they do not already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.loan_application_payments'::regclass
      and conname = 'loan_application_payments_user_id_fkey'
  ) then
    alter table public.loan_application_payments
      add constraint loan_application_payments_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.loan_application_payments'::regclass
      and conname = 'loan_application_payments_verified_by_fkey'
  ) then
    alter table public.loan_application_payments
      add constraint loan_application_payments_verified_by_fkey
      foreign key (verified_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.loan_application_payments'::regclass
      and conname = 'loan_application_payments_loan_application_id_fkey'
  ) then
    alter table public.loan_application_payments
      add constraint loan_application_payments_loan_application_id_fkey
      foreign key (loan_application_id) references public.loan_applications(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.loan_applications'::regclass
      and conname = 'loan_applications_application_payment_id_fkey'
  ) then
    alter table public.loan_applications
      add constraint loan_applications_application_payment_id_fkey
      foreign key (application_payment_id) references public.loan_application_payments(id) on delete restrict;
  end if;
end
$$;

-- Keep only the newest active payment for the same user and requested amount
-- before creating the partial unique index.
with ranked as (
  select id,
    row_number() over (
      partition by user_id, requested_amount
      order by created_at desc, id desc
    ) as row_no
  from public.loan_application_payments
  where status in ('submitted','verified')
)
update public.loan_application_payments payment
set status = 'rejected',
    admin_note = coalesce(payment.admin_note, 'Superseded by a newer application-fee payment during database repair.'),
    updated_at = now()
from ranked
where payment.id = ranked.id and ranked.row_no > 1;

create index if not exists loan_application_payments_status_idx
  on public.loan_application_payments(status, created_at desc);
create index if not exists loan_application_payments_user_idx
  on public.loan_application_payments(user_id, created_at desc);
create unique index if not exists loan_application_payments_active_amount_idx
  on public.loan_application_payments(user_id, requested_amount)
  where status in ('submitted','verified');
create unique index if not exists loan_application_payments_loan_application_unique_idx
  on public.loan_application_payments(loan_application_id)
  where loan_application_id is not null;
create unique index if not exists loan_applications_application_payment_unique_idx
  on public.loan_applications(application_payment_id)
  where application_payment_id is not null;

insert into public.settings(key, value)
values (
  'loan_application_payment_methods',
  '{"bkash_number":"","nagad_number":"","rocket_number":"","bank_name":"","bank_account_name":"","bank_account_number":"","bank_branch":""}'::jsonb
)
on conflict (key) do nothing;

alter table public.loan_application_payments enable row level security;

drop policy if exists "loan_application_payments_select" on public.loan_application_payments;
drop policy if exists "loan_application_payments_insert_own" on public.loan_application_payments;
drop policy if exists "loan_application_payments_admin_update" on public.loan_application_payments;

create policy "loan_application_payments_select" on public.loan_application_payments
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "loan_application_payments_insert_own" on public.loan_application_payments
for insert to authenticated
with check (user_id = auth.uid() and status = 'submitted');

create policy "loan_application_payments_admin_update" on public.loan_application_payments
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Explicit API grants are required for tables created through SQL.
grant usage on schema public to authenticated, service_role;
grant select, insert on table public.loan_application_payments to authenticated;
grant update(status, admin_note, verified_by, verified_at, updated_at)
  on table public.loan_application_payments to authenticated;
grant all privileges on table public.loan_application_payments to service_role;

create or replace function public.submit_loan_application_payment_v2(
  p_requested_amount numeric,
  p_payment_method text,
  p_receiver_reference text,
  p_transaction_id text,
  p_payment_screenshot_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_defaults jsonb := '{}'::jsonb;
  v_channels jsonb := '{}'::jsonb;
  v_savings_percentage numeric := 10;
  v_expected_amount numeric;
  v_expected_receiver text;
  v_existing public.loan_application_payments%rowtype;
  v_payment_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_requested_amount is null or p_requested_amount < 1000 then raise exception 'Choose or enter a valid loan amount first.'; end if;
  if p_payment_method not in ('bkash','nagad','rocket','bank') then raise exception 'Choose a valid payment method.'; end if;
  if nullif(trim(coalesce(p_transaction_id, '')), '') is null then raise exception 'Enter the transaction ID or bank reference.'; end if;
  if nullif(trim(coalesce(p_payment_screenshot_path, '')), '') is null then raise exception 'Upload the payment screenshot or bank receipt.'; end if;

  select coalesce(value, '{}'::jsonb) into v_defaults from public.settings where key = 'loan_defaults';
  select coalesce(value, '{}'::jsonb) into v_channels from public.settings where key = 'loan_application_payment_methods';
  v_savings_percentage := greatest(0, least(100, coalesce((v_defaults->>'savings_percentage')::numeric, 10)));
  v_expected_amount := round(p_requested_amount * (v_savings_percentage / 100), 2);

  v_expected_receiver := case p_payment_method
    when 'bkash' then nullif(trim(coalesce(v_channels->>'bkash_number', '')), '')
    when 'nagad' then nullif(trim(coalesce(v_channels->>'nagad_number', '')), '')
    when 'rocket' then nullif(trim(coalesce(v_channels->>'rocket_number', '')), '')
    when 'bank' then nullif(trim(coalesce(v_channels->>'bank_account_number', '')), '')
  end;

  if v_expected_receiver is null then
    raise exception 'This payment method is not configured by the admin yet.';
  end if;

  select * into v_existing
  from public.loan_application_payments
  where user_id = v_user_id
    and requested_amount = p_requested_amount
    and status in ('submitted','verified')
  order by created_at desc
  limit 1;

  if found then
    if v_existing.status = 'submitted' then
      raise exception 'This payment is already waiting for admin verification.';
    end if;
    return v_existing.id;
  end if;

  insert into public.loan_application_payments (
    user_id, requested_amount, expected_amount, payment_method,
    receiver_reference, transaction_id, payment_screenshot_path, status
  ) values (
    v_user_id, p_requested_amount, v_expected_amount, p_payment_method,
    coalesce(nullif(trim(coalesce(p_receiver_reference, '')), ''), v_expected_receiver),
    trim(p_transaction_id), p_payment_screenshot_path, 'submitted'
  ) returning id into v_payment_id;

  insert into public.app_notifications(user_id, type, title, message, action_url, data)
  select admin_profile.id,
    'loan_application_payment_submitted',
    'New application fee payment',
    coalesce(user_profile.full_name, user_profile.email, 'A user') ||
      ' submitted an application fee payment of ৳' ||
      trim(to_char(v_expected_amount, 'FM999999999990.00')) || ' for approval.',
    '/admin/application-payments',
    jsonb_build_object('payment_id', v_payment_id, 'user_id', v_user_id, 'amount', v_expected_amount)
  from public.profiles admin_profile
  left join public.profiles user_profile on user_profile.id = v_user_id
  where admin_profile.role in ('admin','super_admin')
    and admin_profile.status = 'active';

  return v_payment_id;
end;
$$;

grant execute on function public.submit_loan_application_payment_v2(numeric,text,text,text,text)
  to authenticated;

create or replace function public.consume_verified_loan_application_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.loan_application_payments%rowtype;
begin
  if new.application_payment_id is null then
    raise exception 'A verified application payment is required before submitting the loan application.';
  end if;

  select * into v_payment
  from public.loan_application_payments
  where id = new.application_payment_id
  for update;

  if not found then raise exception 'Application payment was not found.'; end if;
  if v_payment.user_id <> new.user_id then raise exception 'This application payment belongs to another user.'; end if;
  if v_payment.status <> 'verified' or v_payment.loan_application_id is not null then
    raise exception 'The application payment is not verified or has already been used.';
  end if;
  if abs(v_payment.requested_amount - new.requested_amount) > 0.01 then
    raise exception 'The verified payment does not match the requested loan amount.';
  end if;
  if abs(v_payment.expected_amount - new.required_savings_amount) > 0.01 then
    raise exception 'The verified payment does not match the required savings amount.';
  end if;

  update public.loan_application_payments
  set status = 'used', loan_application_id = new.id, updated_at = now()
  where id = v_payment.id;

  return new;
end;
$$;

drop trigger if exists consume_application_payment_after_loan_insert on public.loan_applications;
create trigger consume_application_payment_after_loan_insert
after insert on public.loan_applications
for each row execute function public.consume_verified_loan_application_payment();

create or replace function public.release_application_payment_after_loan_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.application_payment_id is not null then
    update public.loan_application_payments
    set status = 'verified', loan_application_id = null, updated_at = now()
    where id = old.application_payment_id and status = 'used';
  end if;
  return old;
end;
$$;

drop trigger if exists release_application_payment_after_loan_delete on public.loan_applications;
create trigger release_application_payment_after_loan_delete
after delete on public.loan_applications
for each row execute function public.release_application_payment_after_loan_delete();

create or replace function public.notify_admins_new_loan_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' then
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    select admin_profile.id,
      'loan_application_submitted',
      'New loan application submitted',
      coalesce(user_profile.full_name, user_profile.email, 'A user') ||
        ' submitted ' || new.application_no || ' for admin review.',
      '/admin/loans/' || new.id::text,
      jsonb_build_object('loan_id', new.id, 'user_id', new.user_id, 'application_no', new.application_no)
    from public.profiles admin_profile
    left join public.profiles user_profile on user_profile.id = new.user_id
    where admin_profile.role in ('admin','super_admin')
      and admin_profile.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists notify_admins_after_new_loan_application on public.loan_applications;
create trigger notify_admins_after_new_loan_application
after insert on public.loan_applications
for each row execute function public.notify_admins_new_loan_application();

-- Recreate missing admin notifications for any payment already waiting.
insert into public.app_notifications(user_id, type, title, message, action_url, data)
select admin_profile.id,
  'loan_application_payment_submitted',
  'Application fee waiting for approval',
  coalesce(user_profile.full_name, user_profile.email, 'A user') ||
    ' has an application fee payment waiting for review.',
  '/admin/application-payments',
  jsonb_build_object('payment_id', payment.id, 'user_id', payment.user_id, 'amount', payment.expected_amount)
from public.loan_application_payments payment
join public.profiles admin_profile
  on admin_profile.role in ('admin','super_admin') and admin_profile.status = 'active'
left join public.profiles user_profile on user_profile.id = payment.user_id
where payment.status = 'submitted'
  and not exists (
    select 1
    from public.app_notifications notification
    where notification.user_id = admin_profile.id
      and notification.type = 'loan_application_payment_submitted'
      and notification.data->>'payment_id' = payment.id::text
  );

comment on table public.loan_application_payments is
'Application-fee payment proof that must be verified by an admin before final loan application submission.';

commit;

-- Force Supabase PostgREST to discover the table/functions immediately.
notify pgrst, 'reload schema';

-- Verification output: both values must be non-null / true.
select
  to_regclass('public.loan_application_payments') as payment_table,
  to_regprocedure('public.submit_loan_application_payment_v2(numeric,text,text,text,text)') as payment_rpc,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loan_applications'
      and column_name = 'application_payment_id'
  ) as application_payment_column_exists;
