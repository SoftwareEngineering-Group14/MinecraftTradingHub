import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/app/lib/supabaseClient'; 
import { isOriginAllowed, corsHeaders } from '@/app/lib/serverFunctions'; 
import { signUp } from '@/app/lib/auth'; 
import {
  HEADER_ORIGIN,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  STATUS_FORBIDDEN,
  STATUS_CREATED,
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
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

    const supabase = await createServerSideClient();

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: getHeaders() }
      );
    }

    const { user, profile, error } = await signUp(supabase, email, password, name);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: STATUS_BAD_REQUEST, headers: getHeaders() }
      );
    }

    return NextResponse.json(
      { user, profile },
      { status: STATUS_CREATED, headers: getHeaders() }
    );
  } catch (error) {
    console.error('Signup Route Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: getHeaders() }
    );
  }
}