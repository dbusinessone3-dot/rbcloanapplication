-- V14: Repair and strengthen application-fee review and loan approval workflow.
-- Run once in Supabase SQL Editor after the earlier V12/V13 patches.

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

alter table public.loan_applications
  add column if not exists application_payment_id uuid unique
  references public.loan_application_payments(id) on delete restrict;

create index if not exists loan_application_payments_status_idx
  on public.loan_application_payments(status, created_at desc);
create index if not exists loan_application_payments_user_idx
  on public.loan_application_payments(user_id, created_at desc);
create unique index if not exists loan_application_payments_active_amount_idx
  on public.loan_application_payments(user_id, requested_amount)
  where status in ('submitted','verified');

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

grant select, insert on public.loan_application_payments to authenticated;
grant update(status, admin_note, verified_by, verified_at, updated_at) on public.loan_application_payments to authenticated;

-- V14 uses the atomic RPC below to create one admin notification per payment.
drop trigger if exists notify_admins_after_loan_application_payment on public.loan_application_payments;

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
  v_defaults jsonb;
  v_channels jsonb;
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

  select value into v_defaults from public.settings where key = 'loan_defaults';
  select value into v_channels from public.settings where key = 'loan_application_payment_methods';
  v_savings_percentage := greatest(0, least(100, coalesce((v_defaults->>'savings_percentage')::numeric, 10)));
  v_expected_amount := round(p_requested_amount * (v_savings_percentage / 100), 2);

  v_expected_receiver := case p_payment_method
    when 'bkash' then nullif(trim(coalesce(v_channels->>'bkash_number', '')), '')
    when 'nagad' then nullif(trim(coalesce(v_channels->>'nagad_number', '')), '')
    when 'rocket' then nullif(trim(coalesce(v_channels->>'rocket_number', '')), '')
    when 'bank' then nullif(trim(coalesce(v_channels->>'bank_account_number', '')), '')
  end;
  if v_expected_receiver is null then raise exception 'This payment method is not configured by the admin yet.'; end if;

  select * into v_existing
  from public.loan_application_payments
  where user_id = v_user_id and requested_amount = p_requested_amount and status in ('submitted','verified')
  order by created_at desc limit 1;
  if found then
    if v_existing.status = 'submitted' then raise exception 'This payment is already waiting for admin verification.'; end if;
    return v_existing.id;
  end if;

  insert into public.loan_application_payments (
    user_id, requested_amount, expected_amount, payment_method, receiver_reference,
    transaction_id, payment_screenshot_path, status
  ) values (
    v_user_id, p_requested_amount, v_expected_amount, p_payment_method,
    coalesce(nullif(trim(coalesce(p_receiver_reference, '')), ''), v_expected_receiver),
    trim(p_transaction_id), p_payment_screenshot_path, 'submitted'
  ) returning id into v_payment_id;

  insert into public.app_notifications(user_id, type, title, message, action_url, data)
  select p.id, 'loan_application_payment_submitted', 'New application fee payment',
    coalesce(u.full_name, u.email, 'A user') || ' submitted an application fee payment of ৳' || trim(to_char(v_expected_amount, 'FM999999999990.00')) || ' for approval.',
    '/admin/application-payments', jsonb_build_object('payment_id', v_payment_id, 'user_id', v_user_id, 'amount', v_expected_amount)
  from public.profiles p
  left join public.profiles u on u.id = v_user_id
  where p.role in ('admin','super_admin') and p.status = 'active';

  return v_payment_id;
end;
$$;

grant execute on function public.submit_loan_application_payment_v2(numeric,text,text,text,text) to authenticated;

create or replace function public.notify_admins_new_loan_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' then
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    select p.id, 'loan_application_submitted', 'New loan application submitted',
      coalesce(u.full_name, u.email, 'A user') || ' submitted ' || new.application_no || ' for admin review.',
      '/admin/loans/' || new.id::text,
      jsonb_build_object('loan_id', new.id, 'user_id', new.user_id, 'application_no', new.application_no)
    from public.profiles p
    left join public.profiles u on u.id = new.user_id
    where p.role in ('admin','super_admin') and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists notify_admins_after_new_loan_application on public.loan_applications;
create trigger notify_admins_after_new_loan_application
after insert on public.loan_applications
for each row execute function public.notify_admins_new_loan_application();

insert into public.app_notifications(user_id, type, title, message, action_url, data)
select admin_profile.id, 'loan_application_payment_submitted', 'Application fee waiting for approval',
  coalesce(user_profile.full_name, user_profile.email, 'A user') || ' has an application fee payment waiting for review.',
  '/admin/application-payments',
  jsonb_build_object('payment_id', payment.id, 'user_id', payment.user_id, 'amount', payment.expected_amount)
from public.loan_application_payments payment
join public.profiles admin_profile on admin_profile.role in ('admin','super_admin') and admin_profile.status = 'active'
left join public.profiles user_profile on user_profile.id = payment.user_id
where payment.status = 'submitted'
  and not exists (
    select 1 from public.app_notifications notification
    where notification.user_id = admin_profile.id
      and notification.type = 'loan_application_payment_submitted'
      and notification.data->>'payment_id' = payment.id::text
  );

select status, count(*) as payment_count
from public.loan_application_payments
group by status
order by status;
