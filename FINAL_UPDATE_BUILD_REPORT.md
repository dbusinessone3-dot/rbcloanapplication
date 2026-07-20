# Final UI / Loan Settings Update Validation

## Requested fixes

- Client logout: fixed. A logout icon is now visible in the user top bar on desktop and mobile. Desktop sidebar logout remains available.
- Balance privacy: fixed. The dashboard no longer shows the available balance directly in the red hero card. `Show balance` opens a bottom drawer with balance details.
- Default interest: changed from 8% to 5% in the shared fallback and fresh Supabase schema.
- Admin-controlled defaults: added `/admin/settings` for interest rate, service-charge rate, and savings percentage.
- Client sync: loan application and calculator read `public.settings -> loan_defaults`.
- Admin calculation: approval uses the same shared `calculateLoan` function and current admin defaults. Approved amount is recalculated for service charge, savings, monthly installment, and total payable.
- Admin preview: loan review shows a live calculation preview before approval.
- Duplicate approval protection: already-approved/running/completed loans are not credited a second time by the approval action.

## Calculation check

For an approved amount of 100,000, 12 months, 5% annual simple interest, 2% service charge, and 10% required savings:

- Interest: 5,000
- Service charge: 2,000
- Total payable: 107,000
- Monthly installment: 8,916.6667
- Required savings: 10,000

The same shared calculation helper is used by the client estimate, calculator, admin preview, and admin approval flow.

## Validation

- `npm ci`: PASS, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- Next.js production build generated `/admin/settings` and all existing user/admin routes.
- Hardcoded 8% interest references in app/components/lib/schema: none found.

## Existing Supabase database step

Run `supabase/patch-v2-loan-defaults.sql` once in Supabase SQL Editor. This changes the current `loan_defaults.interest_rate` value to 5 for an existing database. After that, admins can manage the values from `/admin/settings`.
