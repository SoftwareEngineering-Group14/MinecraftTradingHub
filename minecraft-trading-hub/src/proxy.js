import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { COOKIE_MAX_AGE_30_DAYS, COOKIE_PATH_ROOT } from './app/lib/serverConstants';

/**
 * Middleware that refreshes the Supabase session AND protects private routes.
 * The 'home' folder is now the primary protected zone for the Minecraft Trading Hub.
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

  // 1. PROTECTED ZONE: If trying to access /home (Hub, Profile, Dashboard) or /onboarding
  if (path.startsWith('/home') || path.startsWith('/onboarding')) {
    if (!user) {
      // No session found, bounce them to signin
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  // 2. AUTH GATE: If already logged in, don't let them go back to signin/signup
  if (user && (path === '/signin' || path === '/signup')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};