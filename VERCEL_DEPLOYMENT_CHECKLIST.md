# Vercel Deployment Checklist

## Before GitHub

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `.env.local` is not tracked
- [ ] `node_modules` and `.next` are not tracked
- [ ] Supabase schema has been installed
- [ ] A user can register and log in locally

## Vercel project

- [ ] Import GitHub repository
- [ ] Framework preset is Next.js
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Add `NEXT_PUBLIC_SITE_URL`
- [ ] Deploy

## Supabase Authentication

- [ ] Set production Site URL to the Vercel URL
- [ ] Add `/auth/callback` production redirect URL
- [ ] Add preview redirect URLs if previews need authentication

## Production test

- [ ] Register and confirm a user
- [ ] Login/logout
- [ ] Bangla/English switch updates the entire interface
- [ ] Profile/KYC files upload
- [ ] Loan application and documents submit
- [ ] Admin reviews loan
- [ ] Deposit verification updates wallet
- [ ] Cash out completes
- [ ] Installment proof verifies
- [ ] Transactions and notifications update
