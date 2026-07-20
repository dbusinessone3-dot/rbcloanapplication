# V15 Application Payment Table Repair

The error below means the application-payment table is missing from the live Supabase database or PostgREST has not refreshed its schema cache:

```text
Could not find the table 'public.loan_application_payments' in the schema cache
```

## Required repair

Open Supabase Dashboard → SQL Editor and run the complete file:

```text
supabase/patch-v15-create-loan-application-payments-and-reload.sql
```

The final verification query must show:

- `payment_table = loan_application_payments`
- `payment_rpc = submit_loan_application_payment_v2(...)`
- `application_payment_column_exists = true`

Then refresh the Apply for Loan page and Admin → Application Payments.

This patch is safe to run more than once. It creates or repairs the table, policies, grants, RPC, triggers, indexes, admin notifications, and reloads the PostgREST schema cache.
