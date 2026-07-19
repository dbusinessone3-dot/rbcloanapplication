# RBC Loan Portal — Next.js + Supabase

A Vercel-ready rebuild of the previous Laravel + Vue loan application.

## Stack

- Next.js 16 App Router + TypeScript
- React 19
- Supabase Auth
- Supabase PostgreSQL with Row Level Security
- Supabase Storage for private KYC, loan documents and payment proof
- Responsive desktop sidebar and mobile bottom navigation
- Global Bangla/English language switching

## Included user features

- Registration, email confirmation, login and logout
- User dashboard and wallet summary
- Bangla/English switch across navigation, buttons and pages
- Profile and KYC submission
- Loan calculator
- Multi-section loan application with guarantor, nominee and documents
- My loans and loan details
- Savings/deposit proof submission
- Cash out requests
- Installment schedule and payment proof submission
- Transactions
- Notifications

## Included admin features

- Admin dashboard and statistics
- Loan review, approval and rejection
- Deposit verification
- Cash out approval/rejection/completion
- Installment verification/rejection
- Notifications and reports
- Automatic wallet and transaction updates for admin decisions

## Important: use a clean Supabase schema

The old Laravel version creates bigint tables with the same names. The Next.js version uses Supabase Auth UUIDs.

**Recommended:** create a fresh Supabase project for this Next.js application.

If the current Supabase project only contains demo data and you deliberately want to delete the Laravel tables:

1. Back up anything important.
2. Run `supabase/reset-old-laravel.sql` in Supabase SQL Editor.
3. Run `supabase/schema.sql`.

The reset script permanently deletes the old application tables.

## 1. Supabase setup

1. Create/open a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql` once.
4. Open **Project Settings → API** and copy:
   - Project URL
   - Publishable key (or legacy anon key)
5. Open **Authentication → URL Configuration**.
6. Set the local Site URL to `http://localhost:3000`.
7. Add `http://localhost:3000/auth/callback` as a redirect URL.

This Next.js application does **not** use the PostgreSQL database password in `.env.local`. It connects through the Supabase Data API with the publishable key and protects data using Auth + RLS.

## 2. Local configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Run locally

Node.js 20.9 or newer is recommended.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production check:

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## 4. Create an admin

1. Register the admin user through `/register`.
2. Confirm the email if email confirmation is enabled.
3. Open `supabase/make-admin.sql`.
4. Replace the example email.
5. Run the SQL in Supabase SQL Editor.
6. Log out and log in again.

Never allow users to select their own role during registration.

## 5. GitHub upload

```bash
git init
git add .
git commit -m "Next.js Supabase loan portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

`.env.local` is ignored and must never be pushed.

## 6. Deploy to Vercel

1. Import the GitHub repository in Vercel.
2. Vercel detects Next.js automatically.
3. Add these environment variables for Production, Preview and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
```

4. Deploy.
5. In Supabase Authentication URL settings, change Site URL to the Vercel production URL.
6. Add this redirect URL:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback
```

7. Redeploy after changing Vercel environment variables.

## Storage security

The SQL installer creates three private buckets:

- `kyc-documents`
- `loan-documents`
- `payment-proofs`

Files are stored under a folder beginning with the authenticated user's UUID. Storage RLS limits users to their own files; admins can review all files.

## Language system

The language provider changes every translated client interface immediately, stores the choice in a cookie and local storage, and synchronizes `preferred_locale` to the user's profile when logged in.

To add or change translations, edit:

```text
lib/i18n.ts
```

## Useful files

```text
app/                     Next.js routes and server actions
components/              Responsive UI and page components
lib/supabase/            Browser/server/proxy Supabase clients
lib/i18n.ts              Bangla and English dictionary
supabase/schema.sql      Database, RLS, triggers and Storage setup
supabase/make-admin.sql  Promote a registered user to admin
supabase/reset-old-laravel.sql  Optional destructive reset
.env.example             Environment variable template
vercel.json              Vercel framework configuration
```

## Build verification

This package was checked with:

```text
npm run typecheck  PASS
npm run lint       PASS
npm run build      PASS
npm audit --omit=dev  0 vulnerabilities
```

## v2 loan settings update

The current default interest rate is 5%. Admin users can change the interest rate, service-charge rate, and savings percentage from `/admin/settings`.

For an existing Supabase database created with the older 8% default, run `supabase/patch-v2-loan-defaults.sql` once in the Supabase SQL Editor. New loan applications and the user calculator read the current `loan_defaults` row from `public.settings`. Admin approval uses the same current defaults and recalculates service charge, required savings, monthly installment, and total payable from the approved amount.

## V11 browser-session authentication

Authentication cookies are session-only. Users remain logged in during the current browser session, but must log in again after fully closing and reopening the browser. No database migration is required.
