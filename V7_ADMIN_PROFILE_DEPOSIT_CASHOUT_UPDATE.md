# V7 Admin Profile Deposit + Cash-out Approval Update

## Updated workflow

### 1. Admin Profile Approvals
- The **Deposit Amount** field is now displayed in a highlighted section directly above **Admin Note**.
- The admin sets the user's one-time cash-out deposit amount while approving the profile.
- Rejecting a profile no longer requires a deposit amount.
- The deposit amount is stored on the user's profile and is shown to the user before the first cash-out.

### 2. User first cash-out deposit popup
- The popup uses the deposit amount stored on the user's approved profile.
- The popup label remains:
  - **Deposit the association's money before cashing out.**
- The user pays the deposit separately using bKash, Nagad, Rocket, or Bank.
- The deposit does not reduce the approved loan amount or available cash-out amount.
- After the deposit is verified once, the popup is removed permanently for future cash-outs.

### 3. Admin Cash-outs page
- The **Admin → Cash Outs** page now shows first cash-out deposit payments above normal cash-out requests.
- Admin can review:
  - User name and phone
  - Admin-set deposit amount
  - Payment method
  - Receiver/reference
  - Transaction ID
  - Payment proof
- Admin can **Approve Deposit** or reject the deposit payment directly from the Cash Outs admin page.
- When the deposit is approved, the user's first cash-out form is unlocked.

### 4. Cash-out approval protection
- Cash-out approve/complete buttons are disabled when the user's one-time deposit is not verified.
- A server-side verification check was added as a second layer of protection.
- Admin cannot approve or complete a cash-out until the user-level deposit is verified.

## Database
No new V7 database migration is required if the V6 Supabase patch has already been executed.

If V6 has not been installed yet, run:

`supabase/patch-v6-profile-photo-one-time-cashout-deposit.sql`

## Validation
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
