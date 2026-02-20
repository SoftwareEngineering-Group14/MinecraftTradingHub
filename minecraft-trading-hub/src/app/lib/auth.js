/**
 * Sign up a new user and create profile
 * @param {Object} supabase - The client (Server or Browser)
 */
export async function signUp(supabase, email, password, name) {
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
      created_at: new Date().toISOString() // Better for Postgres timestamp columns
    }]);

  if (profileError) return { error: profileError };

  return { user: authData.user, profile };
}

/**
 * Sign in an existing user
 * @param {Object} supabase - The client (Server or Browser)
 */
export async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { session: data?.session, error };
}

/**
 * Sign out current user
 */
export async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the role of the currently logged-in user
 */
export async function getUserRole(supabase) {
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