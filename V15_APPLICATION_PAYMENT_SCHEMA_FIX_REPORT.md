# V15 Application Payment Schema-Cache Fix

## Error resolved

```text
Could not find the table 'public.loan_application_payments' in the schema cache
```

## Root cause

The live Supabase database either did not receive the V12/V14 application-payment migration, the migration stopped before completion, or PostgREST did not refresh its schema cache after the table was created.

## Required SQL repair

Run this file in Supabase Dashboard → SQL Editor:

```text
supabase/patch-v15-create-loan-application-payments-and-reload.sql
```

The patch is idempotent and performs all of the following:

- Creates or repairs `public.loan_application_payments`
- Adds `loan_applications.application_payment_id`
- Restores foreign keys and indexes
- Enables RLS and recreates user/admin policies
- Adds explicit authenticated and service-role grants
- Recreates `submit_loan_application_payment_v2`
- Restores payment-consumption and release triggers
- Restores admin loan-submission notifications
- Backfills missing admin notifications for pending payments
- Runs `NOTIFY pgrst, 'reload schema'`
- Returns a verification result at the end

Expected verification values:

```text
payment_table                       loan_application_payments
payment_rpc                         submit_loan_application_payment_v2(...)
application_payment_column_exists   true
```

## Application improvements

- Apply for Loan now displays a clear database-setup message instead of the raw PostgREST error.
- Fee submission converts `PGRST205` / missing-relation errors into actionable instructions.
- Final loan submission also checks for the missing payment table and reports the repair file.
- Admin Application Payments points to the V15 repair patch.

## Validation

- `npm ci` passed
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run build` passed
