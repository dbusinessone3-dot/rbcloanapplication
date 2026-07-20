# V14 — Application Fee Approval and Loan Review Workflow Fix

## Problem reviewed

A user could submit an application-fee payment proof, but the payment was not reliably visible in the admin panel. The final loan form also needed a clearer unlock workflow after fee approval, and the approved loan status needed to be clearer for both admin and user.

## Completed fixes

### 1. Reliable application-fee submission

- Added a secure Supabase function:
  - `submit_loan_application_payment_v2`
- The server now uploads the payment proof and creates the payment record through this atomic database function.
- The application-fee amount is calculated on the server using the active admin loan settings.
- Users cannot change the expected fee using browser inspection.
- Duplicate submitted payments for the same requested loan amount are blocked.
- If database submission fails, the newly uploaded proof is removed to avoid orphaned files.

### 2. Admin receives the fee payment

Admin can review payments from:

- `/admin/application-payments`

The page now shows:

- pending-payment count
- applicant name, email/phone
- requested loan amount
- application fee amount
- payment method
- receiver reference
- transaction ID
- signed payment-proof link
- approve and reject controls

The admin dashboard now shows the exact number of pending application-fee payments.

### 3. Admin notifications repaired

- Submitting an application-fee payment creates a notification for all active admins.
- Existing submitted payments are backfilled into admin notifications when the V14 SQL patch runs.
- Final loan submission also creates an admin notification linking directly to the loan review page.

### 4. Final application button unlock

After the admin approves the fee:

- the user receives an inbox notification
- the Apply for Loan page refreshes automatically while waiting
- a manual **Check approval status** button is available
- the final **Submit Application** button becomes active
- the backend still verifies the approved fee before accepting the loan application

### 5. Loan approval visibility

After the user submits the final application:

- Admin receives a notification.
- Admin reviews it in `/admin/loans/[id]`.
- After approval, the review form is replaced with an **Application approved** confirmation panel.
- The user receives a loan-approved notification.
- The user's loan page displays a prominent approved banner.
- Cash Out and Installments become available only after approval.
- Submitted and under-review applications display a clear waiting banner instead of an active cash-out button.

## Required Supabase patch

Run the following file in Supabase SQL Editor before testing V14:

```text
supabase/patch-v14-application-payment-review-flow.sql
```

This patch repairs the payment table policies, adds the secure submission function, creates admin notifications, and backfills pending-payment notifications.

## Validation

- `npm install` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- npm audit — 0 vulnerabilities

