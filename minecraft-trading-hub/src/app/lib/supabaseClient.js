import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// For API routes: creates a client that sends queries as the authenticated user,
// so RLS policies (auth.uid()) resolve correctly.
export const createAuthenticatedClient = (token) => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
};