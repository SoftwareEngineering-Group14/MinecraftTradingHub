import { NextResponse } from 'next/server';
import { createServerSideClient } from '../../../lib/supabaseClient'; 
import { isOriginAllowed } from '../../../lib/serverFunctions';
import {
  HEADER_ORIGIN,
  HEADER_ACCESS_CONTROL_ALLOW_METHODS,
  HEADER_ACCESS_CONTROL_ALLOW_HEADERS,
  HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ALLOWED_ORIGINS_DEVELOPMENT,
} from '../../../lib/serverConstants';

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;

function corsHeaders(origin) {
  const headers = {
    [HEADER_ACCESS_CONTROL_ALLOW_METHODS]: 'POST, OPTIONS',
    [HEADER_ACCESS_CONTROL_ALLOW_HEADERS]: `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`,
  };

  if (isOriginAllowed(origin, allowedOrigins)) {
    headers[HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
  }

  return headers;
}

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return NextResponse.json(
      { error: ERROR_ORIGIN_NOT_ALLOWED },
      { status: STATUS_FORBIDDEN, headers: corsHeaders(origin) }
    );
  }

  try {
    // CRITICAL FIX: We must await the async supabase client initialization 
    const supabase = await createServerSideClient();

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    // Auth check using the properly initialized client
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', session.user.id);

    if (error) {
      // Handle PostgreSQL unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This username is already taken by another player.' },
          { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { message: 'Username saved successfully' },
      { status: STATUS_OK, headers: corsHeaders(origin) }
    );

  } catch (error) {
    console.error('Username API Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}