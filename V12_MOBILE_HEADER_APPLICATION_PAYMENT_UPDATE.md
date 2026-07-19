# V12 Update — Mobile Header Brand, Application Payment Approval, and Dashboard Image

## Completed changes

### 1. RBC brand added to the mobile header
The user area now shows the RBC logo, **RBC Loan**, and **Royal Bank of Canada** on the left side of the mobile header.

This applies across user pages, including:
- Dashboard
- Apply for loan
- My loans
- Cash out
- Installments
- Transactions
- Profile

### 2. Dashboard image replaced
The user dashboard hero image was replaced with the newly supplied RBC building image.

New asset:
- `public/images/rbc-dashboard-building.jpeg`

### 3. Required savings payment added after nominee information
A new payment-verification step appears after Nominee Information on the Apply for Loan page.

The payment amount is calculated automatically using the current admin savings percentage:

```text
Required payment = Requested loan amount × Savings percentage
```

The user can pay using:
- bKash
- Nagad
- Rocket
- Bank

The page shows the receiver number or bank details configured by an administrator.

The user submits:
- Payment method
- Transaction ID or bank reference
- Payment screenshot/receipt

### 4. Final application button is locked until payment approval
The final **Submit Application** button remains disabled until an administrator verifies the payment.

Flow:

```text
User completes loan and nominee information
        ↓
User pays required savings amount
        ↓
User submits payment proof
        ↓
Admin receives notification
        ↓
Admin opens Application Payments
        ↓
Admin approves or rejects payment
        ↓
User receives notification
        ↓
Submit Application button unlocks
        ↓
User submits final loan application
```

The server and database also validate the verified payment. The user cannot bypass the disabled button by changing browser HTML.

### 5. New admin Application Payments page
New route:

```text
/admin/application-payments
```

The administrator can review:
- User information
- Requested loan amount
- Required savings amount
- Payment method
- Receiver reference
- Transaction ID
- Uploaded payment proof

Admin actions:
- Approve
- Reject

### 6. Payment receiver settings added to Admin Settings
In:

```text
Admin → Settings
```

The administrator can now configure:
- bKash receiver number
- Nagad receiver number
- Rocket receiver number
- Bank name
- Bank account name
- Bank account number
- Branch

### 7. Existing post-application savings proof duplication removed
For new applications that already used an approved pre-application payment, the My Loan detail page shows the payment as approved instead of asking the user to pay the same savings amount again.

## Required Supabase update

Before deploying V12, run:

```text
supabase/patch-v12-loan-application-payment-gateway.sql
```

in:

```text
Supabase Dashboard → SQL Editor → New Query
```

The patch creates:
- `loan_application_payments`
- Payment validation and consumption triggers
- Admin payment notifications
- RLS policies
- Payment receiver settings
- Link between verified payment and final loan application

## Validation

- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- `npm audit --omit=dev` — 0 vulnerabilities

## New route included in production build

```text
/admin/application-payments
```
