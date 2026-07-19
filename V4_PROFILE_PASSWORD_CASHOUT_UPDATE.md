# V4 Update — Profile Approval, Password Reset, Cash Out Deposit Workflow

## 1. Profile approval workflow

User flow:
1. User opens `/profile`.
2. User fills profile and KYC information and submits.
3. Profile status becomes `submitted`.
4. Admin receives an admin notification and sees the profile in `/admin/profiles`.
5. Admin reviews full profile and private KYC documents through signed URLs.
6. Admin approves or rejects.
7. User receives an in-app notification.
8. Approved users see a read-only complete profile summary with verified status.
9. Rejected users see the admin reason and can correct/resubmit the profile.

## 2. Password reset

New routes:
- `/forgot-password`
- `/reset-password`

The login page now contains a Forgot password link.
Supabase sends the recovery email. The callback exchanges the auth code and safely redirects to `/reset-password`.

For production make sure Supabase Authentication URL configuration includes:
- `https://rbcdigitalbank.com/auth/callback`
- `http://localhost:3000/auth/callback`

## 3. New cash out deposit workflow

The previous automatic fixed-deposit deduction flow has been removed.

New flow:
1. User opens Cash Out.
2. Cash Out is locked until a separate deposit is verified.
3. User opens the popup and clicks Deposit.
4. A deposit request is created.
5. Admin receives a notification and the request appears in `/admin/cashout-deposits`.
6. Admin enters the deposit amount and approves it.
7. User receives a notification.
8. User sees the admin-approved deposit amount in the Cash Out popup.
9. User pays the deposit separately through bKash, Nagad, Rocket, or Bank.
10. User submits transaction ID/reference and optional payment proof.
11. Admin verifies or rejects the payment.
12. After verification the Cash Out form unlocks.
13. The deposit amount is NOT deducted from the approved loan amount.
14. The remaining full approved loan balance can be requested for cash out, subject to already reserved/completed cash outs and wallet balance.

## Required Supabase patch

For an existing database, run:

`supabase/patch-v4-profile-reset-cashout-deposit.sql`

The patch:
- reverses only V3 automatic `loan_balance_deduction` records
- removes the old `prepare_cashout_fixed_deposit` function
- creates `cashout_deposit_requests`
- creates secure request/payment RPC functions
- creates admin notifications for profile and deposit requests
- adds profile review protections
- adds RLS policies and grants for the new workflow

Run the patch BEFORE deploying the V4 application code.

## Validation

- `npm ci` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm run build` PASS
- `npm audit --omit=dev` 0 vulnerabilities

New generated routes include:
- `/admin/profiles`
- `/admin/cashout-deposits`
- `/forgot-password`
- `/reset-password`
