import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COOKIE_MAX_AGE_30_DAYS, COOKIE_PATH_ROOT } from './serverConstants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export const createServerSideClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              httpOnly: true,
              sameSite: 'lax',
              maxAge: COOKIE_MAX_AGE_30_DAYS,
              path: COOKIE_PATH_ROOT,
              ...options,
            })
          );
        } catch {
        }
      },
    },
  });
};
