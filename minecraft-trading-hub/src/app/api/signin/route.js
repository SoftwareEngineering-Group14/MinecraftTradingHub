import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/app/lib/supabaseClient'; 
import { isOriginAllowed, corsHeaders } from '@/app/lib/serverFunctions';
import { signIn } from '@/app/lib/auth'; 
import {
  HEADER_ORIGIN,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ERROR_INVALID_CREDENTIALS,
  ALLOWED_ORIGINS_DEVELOPMENT,
} from '@/app/lib/serverConstants';

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`;

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  return NextResponse.json({}, { 
    headers: corsHeaders(origin, allowedOrigins, ALLOWED_METHODS, ALLOWED_HEADERS) 
  });
}

export async function POST(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  const getHeaders = () => corsHeaders(origin, allowedOrigins, ALLOWED_METHODS, ALLOWED_HEADERS);

  try {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers: getHeaders() }
      );
    }

    // Next.js 16 Async Fix
    const supabase = await createServerSideClient();

    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error("Supabase client not initialized correctly");
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: getHeaders() }
      );
    }

    const { session, error } = await signIn(supabase, email, password);

    if (error || !session) {
      return NextResponse.json(
        { error: ERROR_INVALID_CREDENTIALS },
        { status: STATUS_UNAUTHORIZED, headers: getHeaders() }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, interests')
      .eq('id', session.user.id)
      .maybeSingle();

    return NextResponse.json(
      { session, profile }, 
      { status: STATUS_OK, headers: getHeaders() }
    );

  } catch (error) {
    console.error('SignIn Route Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: getHeaders() }
    );
  }
}