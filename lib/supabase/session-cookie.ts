import type { CookieOptions } from '@supabase/ssr';

/**
 * Supabase SSR normally gives auth cookies a long Max-Age. For this project,
 * authenticated cookies must exist only for the current browser session.
 */
export function toBrowserSessionCookieOptions(
  value: string,
  options: CookieOptions = {},
): CookieOptions {
  // Cookie deletion must keep its expiry instruction.
  if (!value || options.maxAge === 0) {
    return {
      ...options,
      maxAge: 0,
    };
  }

  // Omitting Max-Age and Expires creates a browser-session cookie.
  const sessionOptions: CookieOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;

  return {
    ...sessionOptions,
    path: sessionOptions.path ?? '/',
    sameSite: sessionOptions.sameSite ?? 'lax',
    secure: sessionOptions.secure ?? process.env.NODE_ENV === 'production',
  };
}

export function isSupabaseAuthCookie(name: string) {
  return name.startsWith('sb-') && name.includes('-auth-token');
}
