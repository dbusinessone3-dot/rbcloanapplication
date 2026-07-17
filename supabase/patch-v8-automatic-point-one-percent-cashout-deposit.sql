-- RBC Loan Application V8
-- Automatic one-time cash-out deposit = 0.1% of the approved loan amount.
-- Run this after the V6/V7 one-time deposit patches.

begin;

-- Store the loan used for the first deposit and the calculated amount.
alter table public.user_cashout_deposits
  add column if not exists loan_application_id uuid references public.loan_applications(id) on delete set null,
  add column if not exists deposit_amount numeric(14,2) not null default 0;

create index if not exists user_cashout_deposits_loan_idx
  on public.user_cashout_deposits(loan_application_id);

-- Backfill old one-time deposit records from the latest eligible loan.
with latest_loan as (
  select distinct on (user_id)
    user_id,
    id as loan_application_id,
    round((coalesce(approved_amount, requested_amount, 0)::numeric * 0.001), 2) as calculated_deposit
  from public.loan_applications
  where status in ('approved','cashout_requested','cashout_completed','running','completed')
  order by user_id, created_at desc
)
update public.user_cashout_deposits d
set loan_application_id = coalesce(d.loan_application_id, l.loan_application_id),
    deposit_amount = case
      when coalesce(d.deposit_amount, 0) > 0 then d.deposit_amount
      else greatest(l.calculated_deposit, 0.01)
    end,
    updated_at = now()
from latest_loan l
where d.user_id = l.user_id;

-- Profile approval no longer controls the deposit amount. Clear old unverified
-- manually entered values so they cannot be mistaken for the automatic rate.
update public.profiles
set cashout_deposit_amount = 0,
    cashout_deposit_admin_note = null,
    updated_at = now()
where cashout_deposit_verified_at is null;

-- Replace the old RPC with the automatic calculation version.
drop function if exists public.submit_user_cashout_deposit_payment(text,text,text,text);
drop function if exists public.submit_user_cashout_deposit_payment(uuid,text,text,text,text);

create or replace function public.submit_user_cashout_deposit_payment(
  p_loan_application_id uuid,
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
  v_loan public.loan_applications%rowtype;
  v_deposit_amount numeric(14,2);
  v_existing public.user_cashout_deposits%rowtype;
  v_admin record;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_payment_method not in ('bkash','nagad','rocket','bank') then
    raise exception 'Invalid payment method';
  end if;

  if coalesce(trim(p_transaction_id), '') = '' then
    raise exception 'Transaction ID is required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.kyc_status <> 'verified' then
    raise exception 'Your profile must be approved before cash out';
  end if;

  select * into v_loan
  from public.loan_applications
  where id = p_loan_application_id
    and user_id = v_user
    and status in ('approved','cashout_requested','cashout_completed','running','completed')
  for update;

  if not found then
    raise exception 'Eligible approved loan not found';
  end if;

  select * into v_existing
  from public.user_cashout_deposits
  where user_id = v_user;

  if found and v_existing.status = 'verified' then
    raise exception 'Your one-time cash out deposit is already verified';
  end if;

  if v_profile.cashout_deposit_verified_at is not null then
    raise exception 'Your one-time cash out deposit is already verified';
  end if;

  v_deposit_amount := round((coalesce(v_loan.approved_amount, v_loan.requested_amount, 0)::numeric * 0.001), 2);

  if v_deposit_amount <= 0 then
    raise exception 'Unable to calculate deposit amount';
  end if;

  insert into public.user_cashout_deposits (
    user_id,
    loan_application_id,
    deposit_amount,
    status,
    payment_method,
    receiver_reference,
    transaction_id,
    payment_screenshot_path,
    verified_by,
    verified_at,
    admin_note
  ) values (
    v_user,
    v_loan.id,
    v_deposit_amount,
    'submitted',
    p_payment_method,
    nullif(trim(p_receiver_reference), ''),
    trim(p_transaction_id),
    nullif(trim(p_payment_screenshot_path), ''),
    null,
    null,
    null
  )
  on conflict (user_id) do update set
    loan_application_id = excluded.loan_application_id,
    deposit_amount = excluded.deposit_amount,
    status = 'submitted',
    payment_method = excluded.payment_method,
    receiver_reference = excluded.receiver_reference,
    transaction_id = excluded.transaction_id,
    payment_screenshot_path = excluded.payment_screenshot_path,
    verified_by = null,
    verified_at = null,
    admin_note = null,
    updated_at = now();

  insert into public.app_notifications(user_id, type, title, message, action_url, data)
  values(
    v_user,
    'cashout_deposit_payment_submitted',
    'Deposit payment submitted',
    'Your 0.1% cash out deposit payment is waiting for admin verification.',
    '/loan/cashout',
    jsonb_build_object(
      'loan_application_id', v_loan.id,
      'approved_loan_amount', coalesce(v_loan.approved_amount, v_loan.requested_amount, 0),
      'deposit_rate', 0.1,
      'deposit_amount', v_deposit_amount
    )
  );

  for v_admin in
    select id
    from public.profiles
    where role in ('admin','super_admin') and status = 'active'
  loop
    insert into public.app_notifications(user_id, type, title, message, action_url, data)
    values(
      v_admin.id,
      'admin_cashout_deposit_payment_submitted',
      '0.1% cash out deposit submitted',
      coalesce(v_profile.full_name, v_profile.email, 'A user') ||
        ' submitted a deposit payment of ৳' || to_char(v_deposit_amount, 'FM999999999990.00') ||
        ' for admin verification.',
      '/admin/cashout-deposits',
      jsonb_build_object(
        'user_id', v_user,
        'loan_application_id', v_loan.id,
        'approved_loan_amount', coalesce(v_loan.approved_amount, v_loan.requested_amount, 0),
        'deposit_rate', 0.1,
        'deposit_amount', v_deposit_amount
      )
    );
  end loop;
end;
$$;

revoke all on function public.submit_user_cashout_deposit_payment(uuid,text,text,text,text) from public;
grant execute on function public.submit_user_cashout_deposit_payment(uuid,text,text,text,text) to authenticated;

comment on column public.user_cashout_deposits.deposit_amount is
  'Automatically calculated as 0.1 percent of the approved loan amount used for the first cash-out deposit.';

comment on column public.user_cashout_deposits.loan_application_id is
  'Approved loan used to calculate the one-time 0.1 percent cash-out deposit.';

commit;
