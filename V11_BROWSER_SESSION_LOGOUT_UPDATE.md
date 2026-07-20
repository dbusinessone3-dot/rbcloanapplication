# V11 Browser Session Logout Update

## Requirement

Do not keep the user logged in after the entire browser is closed.

## Implementation

Supabase authentication cookies now use browser-session lifetime:

- `Max-Age` is removed from active authentication cookies.
- `Expires` is removed from active authentication cookies.
- Cookie deletion instructions are preserved during logout.
- Browser and server Supabase clients use the same session-cookie policy.
- The Next.js proxy converts older persistent Supabase authentication cookies into browser-session cookies on the user's next request.
- Auth responses use private no-cache headers.

## Expected behavior

1. User logs in.
2. User can refresh pages and continue using the website in the same browser session.
3. User closes the entire browser application.
4. The session cookie is removed by the browser.
5. Opening the website again requires login.

Closing only one tab does not log the user out while the browser remains open.

Some browsers can restore session cookies when a special "continue where you left off" or session-restore setting is enabled. Standard browser behavior is to remove session cookies when the browser is fully closed.

## Files changed

- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/session-cookie.ts`

## Database

No Supabase SQL patch is required.

## Validation

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
