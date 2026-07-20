-- 1. Register the user through the web app first.
-- 2. Replace the email below, then run this in Supabase SQL Editor.
update public.profiles
set role = 'admin', updated_at = now()
where email = 'YOUR-ADMIN-EMAIL@example.com';

select id,email,full_name,role from public.profiles where role in ('admin','super_admin');
