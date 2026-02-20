export async function signUp(supabase, email, password, name) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name, 
      }
    }
  });

  if (authError) return { error: authError };
  if (!authData?.user) return { error: { message: "User creation failed" } };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      name,
      role: 'member',
    }])
    .select()
    .single();

  if (profileError) return { error: profileError };

  return { user: authData.user, profile };
}

/**
 * @param {Object} supabase 
 */
export async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { session: data?.session, error };
}

export async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUserProfile(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*') 
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error.message);
    return null;
  }
  return profile;
}