// src/auth/auth.js
// Client-side authentication utilities
// Note: Sign up and sign in are now handled by server-side API routes at:
// - /api/auth/signup
// - /api/auth/signin
import { supabase } from '../lib/supabaseClient'

/** Sign out current user */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/** Get the role of the currently logged-in user 
 * TODO: Consider moving this to a server-side API route for better security
 * and to prevent direct database queries from the client.
 */
export async function getUserRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) return null
  return profile?.role // 'admin', 'moderator', 'member'
}
