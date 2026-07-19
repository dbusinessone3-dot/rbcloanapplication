-- V12: Payment verification before final loan application submission.
-- Run this once in Supabase SQL Editor before deploying V12.

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

create index if not exists loan_application_payments_status_idx
  on public.loan_application_payments(status, created_at desc);
create index if not exists loan_application_payments_user_idx
  on public.loan_application_payments(user_id, created_at desc);
create unique index if not exists loan_application_payments_active_amount_idx
  on public.loan_application_payments(user_id, requested_amount)
  where status in ('submitted','verified');

alter table public.loan_applications
  add column if not exists application_payment_id uuid unique
  references public.loan_application_payments(id) on delete restrict;

insert into public.settings(key, value)
values (
  'loan_application_payment_methods',
  '{"bkash_number":"","nagad_number":"","rocket_number":"","bank_name":"","bank_account_name":"","bank_account_number":"","bank_branch":""}'::jsonb
)
on conflict (key) do nothing;

create or replace function public.notify_admins_loan_application_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_notifications(user_id, type, title, message, action_url, data)
  select
    p.id,
    'loan_application_payment_submitted',
    'New loan application payment',
    coalesce(u.full_name, u.email, 'A user') || ' submitted a required savings payment for verification.',
    '/admin/application-payments',
    jsonb_build_object('payment_id', new.id, 'user_id', new.user_id, 'amount', new.expected_amount)
  from public.profiles p
  left join public.profiles u on u.id = new.user_id
  where p.role in ('admin','super_admin') and p.status = 'active';
  return new;
end;
$$;

drop trigger if exists notify_admins_after_loan_application_payment on public.loan_application_payments;
create trigger notify_admins_after_loan_application_payment
after insert on public.loan_application_payments
for each row execute function public.notify_admins_loan_application_payment();

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

  if not found then
    raise exception 'Application payment was not found.';
  end if;
  if v_payment.user_id <> new.user_id then
    raise exception 'This application payment belongs to another user.';
  end if;
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

revoke update, delete on public.loan_application_payments from authenticated;
grant select, insert on public.loan_application_payments to authenticated;
grant update(status, admin_note, verified_by, verified_at, updated_at) on public.loan_application_payments to authenticated;

comment on table public.loan_application_payments is
'User payment proof that must be verified before final loan application submission.';
comment on column public.loan_applications.application_payment_id is
'Verified required-savings payment consumed by this loan application.';

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
