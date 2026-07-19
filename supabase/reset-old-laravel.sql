-- DANGER: This permanently deletes tables and data created by the old Laravel version.
-- Use only for a test/demo Supabase project after making a backup.
-- Recommended alternative: create a fresh Supabase project for the Next.js version.

begin;

drop table if exists public.admin_activity_logs cascade;
drop table if exists public.app_notifications cascade;
drop table if exists public.transactions cascade;
drop table if exists public.loan_installments cascade;
drop table if exists public.loan_cashouts cascade;
drop table if exists public.loan_deposits cascade;
drop table if exists public.loan_nominees cascade;
drop table if exists public.loan_guarantors cascade;
drop table if exists public.loan_documents cascade;
drop table if exists public.loan_applications cascade;
drop table if exists public.user_wallets cascade;
drop table if exists public.user_profiles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.settings cascade;
drop table if exists public.personal_access_tokens cascade;
drop table if exists public.cache_locks cascade;
drop table if exists public.cache cascade;
drop table if exists public.failed_jobs cascade;
drop table if exists public.job_batches cascade;
drop table if exists public.jobs cascade;
drop table if exists public.password_reset_tokens cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;
drop table if exists public.migrations cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin(uuid) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.sync_loan_status_after_cashout() cascade;
drop function if exists public.sync_loan_status_after_deposit() cascade;
drop function if exists public.protect_installment_fields() cascade;

commit;
