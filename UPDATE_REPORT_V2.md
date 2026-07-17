# RBC Loan Application - UI and Loan Calculation Update

## Changes completed

1. Added a visible logout button to the client top bar so it is accessible on desktop and mobile. The existing sidebar logout remains available on desktop.
2. Removed the direct available-balance amount from the dashboard hero. A Show balance button now opens a bottom drawer with available balance and wallet details.
3. Changed the fallback and fresh-database default interest rate from 8% to 5%.
4. Added `/admin/settings` so admins can manage interest rate, service-charge rate, and savings percentage.
5. User loan application estimates and the loan calculator now load the current defaults from `public.settings`.
6. Loan submission stores the current admin defaults and the calculated financial amounts.
7. Admin loan approval now recalculates the approved amount with the current admin defaults using the same shared `calculateLoan` function.
8. Admin loan review now displays a live calculation preview for service charge, required savings, monthly installment, and total payable.
9. Added protection against crediting the same already-approved/running/completed loan again through the approve action.
10. Added `supabase/patch-v2-loan-defaults.sql` for existing Supabase projects that still have the old 8% default.

## Existing Supabase projects

Run `supabase/patch-v2-loan-defaults.sql` once in Supabase SQL Editor. Then deploy the new application version.
