import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Note: NEXT_PUBLIC_ prefix is intentional - Supabase's anon key is designed to be public.
    // Security is enforced through Row Level Security (RLS) policies in the database.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // TODO: For enhanced security, implement HTTP-only cookies for session management
    // instead of returning the session in the response body. This prevents XSS attacks
    // from accessing session tokens. Current implementation is acceptable for Supabase's
    // security model but cookies would be more secure.
    return NextResponse.json({
      success: true,
      message: 'Signed in successfully!',
      session: data.session,
    });
  } catch (error) {
    console.error('Unexpected sign in error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
