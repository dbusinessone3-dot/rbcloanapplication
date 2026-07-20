# RBC Loan Application — V10 Loan Form Update

## Completed changes

### 1. Employment type
Added the following option before `Other`:

- Student

The order is now:

1. Salaried
2. Business
3. Freelancer
4. Student
5. Other

### 2. Manual loan amount input
The loan amount section now supports both:

- Preset amount selection buttons
- A visible manual amount input field

When the user selects a preset amount, the manual input updates automatically. When the user types a custom amount, the installment calculation and summary update immediately.

### Validation

The minimum accepted loan amount remains `৳1,000`. The existing server-side validation is still active.

## Files changed

- `components/loan-application-form.tsx`
- `lib/i18n.ts`
- `app/globals.css`

## Build verification

- `npm ci` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed

No Supabase SQL update is required for this change.
