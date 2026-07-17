# RBC Next.js Update Report — Dashboard Hero + Email OTP

## Completed updates

### 1) User dashboard hero redesign
- Replaced the old simple red hero banner with a more professional dashboard feature area.
- Added a large RBC branch interior image as the main visual.
- Added secure-message badge, personalized welcome text, and CTA buttons.
- Added a professional wallet summary panel beside / below the image depending on screen size.
- Kept the existing bottom balance drawer functionality.

### 2) Email OTP verification flow
- Added a new route: `/verify-email`
- Added OTP verification form UI matching the mobile sample style.
- Added resend-code action.
- After registration, if Supabase does not create an immediate session, the user is redirected to the OTP verification page.
- Added server actions:
  - `verifyEmailOtpAction`
  - `resendEmailOtpAction`

### 3) New assets
- Added: `public/images/rbc-branch-interior.jpg`

## Important Supabase note
This project now supports OTP verification in code, but your Supabase Auth project must be configured to send verification codes for signup.

Recommended:
- Supabase Dashboard → Authentication → Email
- Enable email confirmations
- Use the OTP / code-based confirmation mode if available in your Supabase setup
- Keep your Site URL and redirect URLs updated

Suggested redirect URLs:
- `https://rbcdigitalbank.com/auth/callback`
- `https://rbcdigitalbank.com/verify-email`
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/verify-email`

## Validation status
- `npm ci` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

## Main changed files
- `components/dashboard-view.tsx`
- `components/email-otp-form.tsx`
- `app/(auth)/actions.ts`
- `app/(auth)/verify-email/page.tsx`
- `lib/i18n.ts`
- `app/globals.css`
- `public/images/rbc-branch-interior.jpg`
