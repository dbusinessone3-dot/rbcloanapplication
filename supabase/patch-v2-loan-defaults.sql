-- RBC Loan Application v2 settings patch
-- Run this once in Supabase SQL Editor for an existing database.
-- It changes the current default interest rate to 5% while keeping
-- service-charge and savings defaults available for admin management.

insert into public.settings(key, value)
values (
  'loan_defaults',
  '{"interest_rate":5,"service_charge_rate":2,"savings_percentage":10}'::jsonb
)
on conflict (key) do update
set value = jsonb_set(
  jsonb_set(
    jsonb_set(coalesce(public.settings.value, '{}'::jsonb), '{interest_rate}', '5'::jsonb, true),
    '{service_charge_rate}', coalesce(public.settings.value->'service_charge_rate', '2'::jsonb), true
  ),
  '{savings_percentage}', coalesce(public.settings.value->'savings_percentage', '10'::jsonb), true
),
updated_at = now();

select key, value
from public.settings
where key = 'loan_defaults';
