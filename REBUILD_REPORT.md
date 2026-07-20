# Laravel/Vue to Next.js Rebuild Report

## Result

A separate Next.js application was created. The previous Laravel project was not modified.

## Architecture changes

- Laravel Sanctum authentication -> Supabase Auth
- Laravel controllers/API routes -> Next.js Server Actions and Server Components
- Laravel migrations -> Supabase SQL schema
- Laravel public/local storage -> private Supabase Storage buckets
- Vue Router -> Next.js App Router
- Vue reactive translation service -> React language provider
- Bootstrap-heavy interface -> custom responsive component styling
- PHP/cPanel deployment -> Node.js/Vercel deployment

## Implemented routes

### Public
- `/login`
- `/register`
- `/auth/callback`

### User
- `/dashboard`
- `/profile`
- `/loan/apply`
- `/my-loans`
- `/my-loans/[id]`
- `/loan/cashout`
- `/installments`
- `/transactions`
- `/notifications`
- `/calculator`
- `/language`

### Admin
- `/admin/dashboard`
- `/admin/loans`
- `/admin/loans/[id]`
- `/admin/deposits`
- `/admin/cashouts`
- `/admin/installments`
- `/admin/notifications`
- `/admin/reports`

## Data migration note

Laravel user password hashes are not automatically moved to Supabase Auth. Existing users should register again, use an email invitation flow, or be migrated through a controlled admin script using the Supabase Admin API. No service-role key is included in this project.
