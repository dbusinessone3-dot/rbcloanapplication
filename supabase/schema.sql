-- RBC Loan Portal - Supabase schema
-- Run this entire file in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

-- Stop instead of silently reusing incompatible Laravel bigint tables.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='loan_applications'
      and column_name='id' and data_type in ('bigint','integer')
  ) then
    raise exception 'Existing Laravel tables detected. Use a fresh Supabase project, or run supabase/reset-old-laravel.sql first (it deletes old app data).';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user','admin','super_admin')),
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  preferred_locale text not null default 'bn' check (preferred_locale in ('bn','en')),
  country text,
  city text,
  address text,
  date_of_birth date,
  gender text,
  passport_number text,
  nid_number text,
  profile_photo_path text,
  nid_front_path text,
  nid_back_path text,
  kyc_status text not null default 'not_submitted' check (kyc_status in ('not_submitted','submitted','under_review','verified','rejected')),
  kyc_rejection_reason text,
  kyc_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_balance numeric(14,2) not null default 0,
  total_approved_loan numeric(14,2) not null default 0,
  total_cashout numeric(14,2) not null default 0,
  total_deposit numeric(14,2) not null default 0,
  total_installment_paid numeric(14,2) not null default 0,
  outstanding_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_no text not null unique,
  country text,
  employment_type text,
  monthly_income numeric(14,2) not null default 0,
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  approved_amount numeric(14,2),
  duration_months integer not null default 12 check (duration_months > 0),
  interest_rate numeric(8,2) not null default 0,
  service_charge numeric(14,2) not null default 0,
  savings_percentage numeric(8,2) not null default 0,
  required_savings_amount numeric(14,2) not null default 0,
  monthly_installment numeric(14,2) not null default 0,
  total_payable numeric(14,2) not null default 0,
  loan_purpose text,
  admin_note text,
  rejection_reason text,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','deposit_pending','deposit_submitted','approved','rejected','cashout_requested','cashout_completed','running','completed','cancelled')),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loan_applications_user_status_idx on public.loan_applications(user_id,status);

create table if not exists public.loan_guarantors (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  relation text,
  occupation text,
  address text,
  nid_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_nominees (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  relation text,
  address text,
  nid_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_documents (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  original_name text,
  file_path text not null,
  mime_type text,
  file_size bigint,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_deposits (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null,
  receiver_number text,
  transaction_id text,
  payment_screenshot_path text,
  status text not null default 'submitted' check (status in ('pending','submitted','verified','rejected')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_cashouts (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  approved_amount numeric(14,2),
  payment_method text not null,
  mobile_number text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  admin_note text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  submitted_amount numeric(14,2) not null default 0,
  late_fee numeric(14,2) not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming','due','submitted','paid','late','partially_paid','rejected','cancelled')),
  payment_method text,
  transaction_id text,
  payment_screenshot_path text,
  paid_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejected_at timestamptz,
  admin_note text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(loan_application_id,installment_no)
);
create index if not exists loan_installments_user_status_idx on public.loan_installments(user_id,status);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loan_application_id uuid references public.loan_applications(id) on delete set null,
  loan_deposit_id uuid references public.loan_deposits(id) on delete set null,
  loan_cashout_id uuid references public.loan_cashouts(id) on delete set null,
  loan_installment_id uuid references public.loan_installments(id) on delete set null,
  transaction_no text not null unique,
  type text not null,
  direction text not null check (direction in ('credit','debit')),
  amount numeric(14,2) not null,
  balance_before numeric(14,2) not null default 0,
  balance_after numeric(14,2) not null default 0,
  status text not null default 'successful' check (status in ('pending','successful','failed','cancelled')),
  payment_method text,
  external_transaction_id text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  action_url text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  subject_type text,
  subject_id uuid,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Updated-at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','user_wallets','loan_applications','loan_guarantors','loan_nominees','loan_documents','loan_deposits','loan_cashouts','loan_installments','transactions','app_notifications','settings']
  LOOP
    EXECUTE format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    EXECUTE format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- Auth user -> profile and wallet
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,full_name,phone,role,preferred_locale)
  values(new.id,new.email,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'phone','user',coalesce(new.raw_user_meta_data->>'preferred_locale','bn'))
  on conflict(id) do nothing;
  insert into public.user_wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id=check_user and p.role in ('admin','super_admin') and p.status='active');
$$;

-- Keep user-created cash out/deposit changes in sync with loan status.
create or replace function public.sync_loan_status_after_cashout()
returns trigger language plpgsql security definer set search_path=public as $$
begin update public.loan_applications set status='cashout_requested' where id=new.loan_application_id; return new; end $$;
drop trigger if exists after_cashout_insert on public.loan_cashouts;
create trigger after_cashout_insert after insert on public.loan_cashouts for each row execute function public.sync_loan_status_after_cashout();

create or replace function public.sync_loan_status_after_deposit()
returns trigger language plpgsql security definer set search_path=public as $$
begin update public.loan_applications set status='deposit_submitted' where id=new.loan_application_id; return new; end $$;
drop trigger if exists after_deposit_insert on public.loan_deposits;
create trigger after_deposit_insert after insert on public.loan_deposits for each row execute function public.sync_loan_status_after_deposit();

-- Prevent normal users from changing sensitive installment schedule fields.
create or replace function public.protect_installment_fields()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    if new.user_id<>old.user_id or new.loan_application_id<>old.loan_application_id or new.installment_no<>old.installment_no or new.due_date<>old.due_date or new.amount<>old.amount or new.paid_amount<>old.paid_amount or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at then
      raise exception 'Protected installment fields cannot be changed by a user';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_installment_fields_trigger on public.loan_installments;
create trigger protect_installment_fields_trigger before update on public.loan_installments for each row execute function public.protect_installment_fields();

-- RBC Loan App v3 patch
-- Securely reserve the required fixed deposit from the approved loan balance
-- before the user can submit a cash out request.

create unique index if not exists loan_deposits_one_auto_deduction_per_loan_idx
on public.loan_deposits(loan_application_id)
where payment_method = 'loan_balance_deduction' and status = 'verified';

create or replace function public.prepare_cashout_fixed_deposit(p_loan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_loan public.loan_applications%rowtype;
  v_wallet public.user_wallets%rowtype;
  v_required numeric(14,2) := 0;
  v_verified numeric(14,2) := 0;
  v_deduction numeric(14,2) := 0;
  v_deposit_id uuid;
  v_balance_after numeric(14,2) := 0;
  v_original_status text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select * into v_loan
  from public.loan_applications
  where id = p_loan_id and user_id = v_user
  for update;

  if not found then
    raise exception 'Loan not found';
  end if;

  if v_loan.status not in ('approved','cashout_requested','cashout_completed','running') then
    raise exception 'Loan is not eligible for cash out';
  end if;

  v_original_status := v_loan.status;

  select * into v_wallet
  from public.user_wallets
  where user_id = v_user
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  v_required := greatest(coalesce(v_loan.required_savings_amount, 0), 0);

  select coalesce(sum(amount), 0) into v_verified
  from public.loan_deposits
  where loan_application_id = p_loan_id
    and user_id = v_user
    and status = 'verified';

  v_deduction := greatest(v_required - v_verified, 0);

  if v_deduction > 0 then
    if coalesce(v_wallet.available_balance, 0) < v_deduction then
      raise exception 'Available loan balance is lower than the required fixed deposit';
    end if;

    insert into public.loan_deposits (
      loan_application_id,
      user_id,
      amount,
      payment_method,
      transaction_id,
      status,
      verified_at,
      admin_note
    ) values (
      p_loan_id,
      v_user,
      v_deduction,
      'loan_balance_deduction',
      'AUTO-DEP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      'verified',
      now(),
      'Automatically reserved from approved loan balance before cash out.'
    ) returning id into v_deposit_id;

    v_balance_after := coalesce(v_wallet.available_balance, 0) - v_deduction;

    update public.user_wallets
    set available_balance = v_balance_after,
        total_deposit = coalesce(total_deposit, 0) + v_deduction
    where user_id = v_user;

    insert into public.transactions (
      user_id,
      loan_application_id,
      loan_deposit_id,
      transaction_no,
      type,
      direction,
      amount,
      balance_before,
      balance_after,
      status,
      payment_method,
      description
    ) values (
      v_user,
      p_loan_id,
      v_deposit_id,
      'TX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      'fixed_deposit_deduction',
      'debit',
      v_deduction,
      coalesce(v_wallet.available_balance, 0),
      v_balance_after,
      'successful',
      'loan_balance_deduction',
      'Fixed deposit reserved from approved loan balance before cash out'
    );

    insert into public.app_notifications (
      user_id,
      type,
      title,
      message,
      action_url
    ) values (
      v_user,
      'fixed_deposit_reserved',
      'Fixed deposit reserved',
      'Your required fixed deposit was deducted from the approved loan balance. The remaining amount is now available for cash out.',
      '/loan/cashout?loan=' || p_loan_id::text
    );

    -- The existing deposit trigger temporarily marks the loan as deposit_submitted.
    -- Restore the original cash-out eligible state because this deposit is already verified.
    update public.loan_applications
    set status = v_original_status
    where id = p_loan_id;
  else
    v_balance_after := coalesce(v_wallet.available_balance, 0);
  end if;

  return jsonb_build_object(
    'loan_id', p_loan_id,
    'required_deposit', v_required,
    'already_verified', v_verified,
    'deducted_now', v_deduction,
    'available_balance', v_balance_after
  );
end;
$$;

revoke all on function public.prepare_cashout_fixed_deposit(uuid) from public;
grant execute on function public.prepare_cashout_fixed_deposit(uuid) to authenticated;


-- Row Level Security
alter table public.profiles enable row level security;
alter table public.user_wallets enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loan_guarantors enable row level security;
alter table public.loan_nominees enable row level security;
alter table public.loan_documents enable row level security;
alter table public.loan_deposits enable row level security;
alter table public.loan_cashouts enable row level security;
alter table public.loan_installments enable row level security;
alter table public.transactions enable row level security;
alter table public.app_notifications enable row level security;
alter table public.settings enable row level security;
alter table public.admin_activity_logs enable row level security;

-- Remove this application's policies so this installer can be safely rerun.
DO $$
DECLARE r record;
BEGIN
  FOR r IN select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('profiles','user_wallets','loan_applications','loan_guarantors','loan_nominees','loan_documents','loan_deposits','loan_cashouts','loan_installments','transactions','app_notifications','settings','admin_activity_logs')
  LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

drop policy if exists "storage_select_own_or_admin" on storage.objects;
drop policy if exists "storage_insert_own" on storage.objects;
drop policy if exists "storage_update_own_or_admin" on storage.objects;
drop policy if exists "storage_delete_own_or_admin" on storage.objects;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
-- User wallets
create policy "wallet_select_own_or_admin" on public.user_wallets for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "wallet_admin_update" on public.user_wallets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "wallet_admin_insert" on public.user_wallets for insert to authenticated with check (public.is_admin());
-- Loan applications
create policy "loan_select_own_or_admin" on public.loan_applications for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "loan_insert_own" on public.loan_applications for insert to authenticated with check (user_id=auth.uid());
create policy "loan_admin_update" on public.loan_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "loan_delete_draft_own_or_admin" on public.loan_applications for delete to authenticated using ((user_id=auth.uid() and status in ('draft','submitted')) or public.is_admin());
-- Related application data
create policy "guarantor_select" on public.loan_guarantors for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "guarantor_insert" on public.loan_guarantors for insert to authenticated with check (user_id=auth.uid() or public.is_admin());
create policy "guarantor_admin_update" on public.loan_guarantors for update to authenticated using (public.is_admin());
create policy "nominee_select" on public.loan_nominees for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "nominee_insert" on public.loan_nominees for insert to authenticated with check (user_id=auth.uid() or public.is_admin());
create policy "nominee_admin_update" on public.loan_nominees for update to authenticated using (public.is_admin());
create policy "documents_select" on public.loan_documents for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "documents_insert" on public.loan_documents for insert to authenticated with check (user_id=auth.uid() or public.is_admin());
create policy "documents_admin_update" on public.loan_documents for update to authenticated using (public.is_admin());
-- Deposits
create policy "deposits_select" on public.loan_deposits for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "deposits_insert" on public.loan_deposits for insert to authenticated with check (user_id=auth.uid());
create policy "deposits_admin_update" on public.loan_deposits for update to authenticated using (public.is_admin());
-- Cashouts
create policy "cashouts_select" on public.loan_cashouts for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "cashouts_insert" on public.loan_cashouts for insert to authenticated with check (user_id=auth.uid());
create policy "cashouts_admin_update" on public.loan_cashouts for update to authenticated using (public.is_admin());
-- Installments
create policy "installments_select" on public.loan_installments for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "installments_user_or_admin_update" on public.loan_installments for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
create policy "installments_admin_insert" on public.loan_installments for insert to authenticated with check (public.is_admin());
-- Transactions
create policy "transactions_select" on public.transactions for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "transactions_admin_insert" on public.transactions for insert to authenticated with check (public.is_admin());
-- Notifications
create policy "notifications_select" on public.app_notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "notifications_insert_self_or_admin" on public.app_notifications for insert to authenticated with check (user_id=auth.uid() or public.is_admin());
create policy "notifications_update_self_or_admin" on public.app_notifications for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
-- Settings and audit
create policy "settings_read" on public.settings for select to authenticated using (true);
create policy "settings_admin_write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "activity_admin_only" on public.admin_activity_logs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Restrict role/status changes through the Data API. Promote admins manually in SQL.
revoke update on public.profiles from authenticated;
grant update(full_name,phone,preferred_locale,country,city,address,date_of_birth,gender,passport_number,nid_number,profile_photo_path,nid_front_path,nid_back_path,kyc_status,updated_at) on public.profiles to authenticated;

-- Private storage buckets
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('kyc-documents','kyc-documents',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
  ('loan-documents','loan-documents',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
  ('payment-proofs','payment-proofs',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "storage_select_own_or_admin" on storage.objects for select to authenticated using (
  bucket_id in ('kyc-documents','loan-documents','payment-proofs') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin())
);
create policy "storage_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id in ('kyc-documents','loan-documents','payment-proofs') and (storage.foldername(name))[1]=auth.uid()::text
);
create policy "storage_update_own_or_admin" on storage.objects for update to authenticated using (
  bucket_id in ('kyc-documents','loan-documents','payment-proofs') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin())
);
create policy "storage_delete_own_or_admin" on storage.objects for delete to authenticated using (
  bucket_id in ('kyc-documents','loan-documents','payment-proofs') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin())
);

insert into public.settings(key,value) values
('loan_defaults','{"interest_rate":5,"service_charge_rate":2,"savings_percentage":10}'::jsonb)
on conflict(key) do nothing;


-- ---------------------------------------------------------------------------
-- V4 workflow patch included for fresh installs and safe reruns.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- V6: approved profile photo + one-time user-level cash out deposit
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- V8 automatic 0.1% first cash-out deposit
-- ---------------------------------------------------------------------------
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
