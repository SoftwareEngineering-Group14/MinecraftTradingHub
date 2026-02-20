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
    const { interests } = body;

    if (!interests || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'Interests must be an array of selected tags.' },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    // Verify session using the properly initialized client
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Update the 'interests' text[] column in the database
    const { error } = await supabase
      .from('profiles')
      .update({ interests: interests })
      .eq('id', session.user.id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Interests updated successfully' },
      { status: STATUS_OK, headers: corsHeaders(origin) }
    );

  } catch (error) {
    console.error('Interests API Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}