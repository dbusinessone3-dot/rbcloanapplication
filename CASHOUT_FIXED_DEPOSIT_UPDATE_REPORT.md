# RBC Next.js Cash Out Fixed Deposit Update

## New cash-out flow

1. User clicks **Cash Out**.
2. The cash-out page selects the approved loan.
3. If the required fixed deposit has not yet been satisfied, a bottom drawer opens automatically.
4. The drawer shows:
   - Approved loan amount
   - Required fixed deposit
   - Remaining amount available for cash out
5. User clicks **Confirm deposit and continue**.
6. The database function securely reserves the remaining required deposit from the user's approved-loan wallet balance.
7. The reserved amount is added to the wallet savings/deposit total.
8. A transaction and notification are created.
9. User returns to the cash-out form with the remaining eligible amount calculated automatically.
10. Server-side validation prevents requesting more than the per-loan remaining cash-out amount or the available wallet balance.

## Example

Approved loan: 1,500,000
Required fixed deposit: 150,000
Cash out available after confirmation: 1,350,000

## Security / calculation fixes

- Added PostgreSQL RPC `prepare_cashout_fixed_deposit(uuid)` as `SECURITY DEFINER`.
- RPC verifies `auth.uid()` owns the loan.
- Loan and wallet rows are locked during deposit reservation.
- Deposit deduction is atomic.
- Duplicate automatic deduction is protected by a partial unique index.
- Existing verified deposits are counted before calculating the remaining deposit.
- Pending, approved, and completed cash-outs are reserved when calculating the next allowed cash-out amount.
- Direct form submission cannot bypass the fixed-deposit requirement.
- Direct form submission cannot request more than the calculated maximum cash-out amount.
- Admin deposit verification now ignores already verified or rejected deposits, preventing duplicate wallet deposit credit.

## Database patch required for an existing Supabase project

Run this file in Supabase SQL Editor:

`supabase/patch-v3-cashout-fixed-deposit.sql`

For a new Supabase project, the same function is already included in `supabase/schema.sql`.

## Main changed files

- `components/cashout-view.tsx`
- `components/submit-button.tsx`
- `app/(user)/actions.ts`
- `app/(user)/loan/cashout/page.tsx`
- `app/(admin)/admin/actions.ts`
- `components/admin-deposits-view.tsx`
- `lib/i18n.ts`
- `app/globals.css`
- `supabase/schema.sql`
- `supabase/patch-v3-cashout-fixed-deposit.sql`

## Validation

- `npm ci` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm run build` PASS
- `npm audit --omit=dev` PASS — 0 vulnerabilities
