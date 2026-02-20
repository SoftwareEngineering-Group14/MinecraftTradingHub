import { createServerSideClient } from './supabaseClient';

/** Sign up a new user and create profile with default role 'member' */
export async function signUp(email, password, name) {
  const supabase = await createServerSideClient();

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) return { error: authError };

  // 2. Insert profile into 'profiles' table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      name,
      role: 'member',
      // Supabase usually handles created_at via DEFAULT in the DB,
      // but keeping it here is fine.
      created_at: new Date().toISOString()
    }]);

  if (profileError) return { error: profileError };

  return { user: authData.user, profile };
}

/** Sign in an existing user */
export async function signIn(email, password) {
  const supabase = await createServerSideClient();
  const { data: session, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { session, error };
}

/** Sign out current user */
export async function signOut() {
  const supabase = await createServerSideClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/** Get the role of the currently logged-in user */
export async function getUserRole() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return profile?.role;
}
