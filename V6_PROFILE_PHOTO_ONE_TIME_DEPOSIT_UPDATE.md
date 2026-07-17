# RBC Loan Next.js — V6 Update

## 1. Approved profile photo workflow

The user profile now requires a profile photo before profile/KYC submission.

Flow:

1. User fills the profile form.
2. User uploads a profile photo and KYC documents.
3. User submits the profile for admin approval.
4. Admin sees the user's actual profile photo in `/admin/profiles` together with KYC information.
5. Admin approves or rejects the profile.
6. After approval, the user sees a complete read-only profile with the approved profile photo and verified badge.
7. The user receives a profile approval notification.

## 2. One-time cash-out deposit per user

The previous per-loan deposit workflow has been replaced.

The deposit is now stored at the user profile level:

- `profiles.cashout_deposit_amount`
- `profiles.cashout_deposit_verified_at`
- `profiles.cashout_deposit_verified_by`
- `profiles.cashout_deposit_admin_note`

Admin sets the one-time deposit amount when approving the user's profile. Admin can update the amount later only while the deposit has not yet been verified.

## 3. Cash-out flow

Flow:

1. User opens Cash Out.
2. If the one-time deposit has never been verified, the deposit popup appears.
3. Popup label:
   `Deposit the association's money before cashing out.`
4. The popup shows the deposit amount configured on the user's approved profile.
5. The user pays separately using bKash, Nagad, Rocket, or Bank.
6. The user submits the transaction/reference details and payment proof.
7. Admin sees the payment in `/admin/cashout-deposits`.
8. Admin verifies or rejects the payment.
9. When approved, the user receives a notification.
10. The deposit popup disappears permanently for that user.
11. Future cash-outs do not ask for the deposit again.
12. The deposit is not deducted from the approved loan amount or cash-out amount.
13. The user can request the full remaining eligible loan amount.

The server action also checks the one-time deposit verification status, so the user cannot bypass the popup by manually submitting the cash-out form.

## 4. Database patch

For an existing Supabase project, run:

`supabase/patch-v6-profile-photo-one-time-cashout-deposit.sql`

Run it once in:

Supabase Dashboard → SQL Editor → New Query → Paste SQL → Run

The patch:

- adds profile-level deposit fields
- creates `user_cashout_deposits`
- migrates useful V4 deposit data
- removes legacy cash-out deposit credits from wallet savings
- keeps old approved deposit users verified when possible
- creates the secure one-time deposit payment RPC
- adds RLS policies
- prevents normal users from editing admin-controlled deposit fields

## 5. Main changed files

- `app/(user)/actions.ts`
- `app/(user)/profile/page.tsx`
- `app/(user)/loan/cashout/page.tsx`
- `app/(admin)/admin/actions.ts`
- `app/(admin)/admin/profiles/page.tsx`
- `app/(admin)/admin/cashout-deposits/page.tsx`
- `app/(admin)/admin/dashboard/page.tsx`
- `components/profile-form.tsx`
- `components/admin-profiles-view.tsx`
- `components/cashout-view.tsx`
- `components/admin-cashout-deposits-view.tsx`
- `lib/types.ts`
- `lib/i18n.ts`
- `app/globals.css`
- `supabase/schema.sql`
- `supabase/patch-v6-profile-photo-one-time-cashout-deposit.sql`

## Validation

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- Next.js production routes generated successfully

The package uses `pnpm-lock.yaml` and pins pnpm 10 in `package.json`.
