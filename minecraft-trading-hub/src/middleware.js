import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { COOKIE_MAX_AGE_30_DAYS, COOKIE_PATH_ROOT } from './app/lib/serverConstants';

/**
 * Middleware that refreshes the Supabase session on every request.
 * This ensures the access token is renewed using the refresh token so
 * the user remains logged in without having to re-authenticate.
 * Cookie options are configured via serverConstants.js.
 */
export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write updated cookies to both the outgoing request and response
        // so downstream route handlers and the browser both receive them.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE_30_DAYS,
            path: COOKIE_PATH_ROOT,
            ...options,
          })
        );
      },
    },
  });

  // Calling getUser() triggers a silent token refresh when the access token
  // is near expiry, using the refresh token stored in the session cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
