import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { COOKIE_MAX_AGE_30_DAYS, COOKIE_PATH_ROOT } from './app/lib/serverConstants';

/**
 * Middleware that refreshes the Supabase session AND protects private routes.
 * Handles the "Bouncer" logic for Onboarding and Protected Zones.
 */
export async function proxy(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
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

  // Check for an active session
  const { data: { user } } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const path = url.pathname;

  // 1. PROTECTION: If no user, kick them to /signin for any protected routes
  if (path.startsWith('/home') || path.startsWith('/onboarding')) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  if (user && path.startsWith('/home') && !user.user_metadata?.username) {
    return NextResponse.redirect(new URL('/onboarding/username', request.url));
  }

  if (user && (path === '/signin' || path === '/signup')) {
    const destination = user.user_metadata?.username ? '/home/dashboard' : '/onboarding/username';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};