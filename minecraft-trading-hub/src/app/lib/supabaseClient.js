import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

// For server-side API routes that need to bypass RLS (admin operations).
// Requires SUPABASE_SERVICE_ROLE_KEY in environment (server-only, never NEXT_PUBLIC_).
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};