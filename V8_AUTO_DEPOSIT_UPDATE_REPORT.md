# RBC Loan Application — V8 Automatic 0.1% Cash-Out Deposit

## Requested changes completed

### 1. Automatic deposit calculation
- The first cash-out deposit is now calculated automatically as **0.1% of the selected approved loan amount**.
- Example: approved loan `৳1,500,000` → deposit `৳1,500`.
- The deposit is paid separately and is not deducted from the approved loan or cash-out balance.

### 2. User cash-out popup
The first cash-out popup now shows:
- Approved loan amount
- Deposit rate: `0.1%`
- Calculated deposit amount
- Message: **“Please pay deposit and confirm with admin before cash out”**
- Payment buttons for bKash, Nagad, Rocket, and Bank
- Receiver/reference, transaction ID, and payment proof fields

After submission:
- The user sees a waiting-for-admin status.
- Admin users receive an in-app notification linking to `/admin/cashout-deposits`.
- After admin approval, the popup is removed and the user can submit the full eligible cash-out amount.
- This deposit is required only once per user.

### 3. Admin Profile Approvals
- Removed the deposit amount input from `Admin → Profile Approvals`.
- Profile approval now handles only profile/KYC review and the admin note.

### 4. Admin Cash-Out Deposits
The admin deposit page now shows:
- User information
- Loan application number
- Approved loan amount
- Automatically calculated 0.1% deposit amount
- Payment method
- Receiver/reference
- Transaction ID
- Payment proof

Admin can verify or reject the deposit payment.

### 5. Server-side protection
- Deposit amount is calculated again inside a secure Supabase PostgreSQL function.
- The browser cannot change the required percentage or deposit amount.
- Cash-out submission and admin cash-out approval remain blocked until the deposit is verified.

## Required Supabase patch
Run this file in Supabase SQL Editor before deploying V8:

```text
supabase/patch-v8-automatic-point-one-percent-cashout-deposit.sql
```

The main `supabase/schema.sql` also includes the V8 changes for new installations.

## Validation
- `npm ci` — PASS, 0 vulnerabilities
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

## Main files changed
- `components/cashout-view.tsx`
- `components/admin-profiles-view.tsx`
- `components/admin-cashout-deposits-view.tsx`
- `components/admin-cashouts-view.tsx`
- `components/profile-form.tsx`
- `app/(user)/actions.ts`
- `app/(user)/loan/cashout/page.tsx`
- `app/(admin)/admin/actions.ts`
- `app/(admin)/admin/cashout-deposits/page.tsx`
- `app/(admin)/admin/cashouts/page.tsx`
- `lib/types.ts`
- `lib/i18n.ts`
- `app/globals.css`
- `supabase/patch-v8-automatic-point-one-percent-cashout-deposit.sql`
- `supabase/schema.sql`
