import { NextResponse } from 'next/server';
import { createServerSideClient } from '../../lib/supabaseClient'; // Factory helper
import { isOriginAllowed } from '../../lib/serverFunctions';
import { signIn } from '../../lib/auth'; // Updated helper
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
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ERROR_INVALID_CREDENTIALS,
  ALLOWED_ORIGINS_DEVELOPMENT,
} from '../../lib/serverConstants';

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

  try {
    // 1. CORS Validation
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers: corsHeaders(origin) }
      );
    }

    // 2. Initialize the Server-Side Client for this specific request
    // CRITICAL FIX: Add 'await' for Next.js 16 compatibility
    const supabase = await createServerSideClient();

    const body = await request.json();
    const { email, password } = body;

    // 3. Validate input fields
    if (!email || !password) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    // 4. Call the signIn helper with the injected supabase client
    const { session, error } = await signIn(supabase, email, password);

    if (error) {
      return NextResponse.json(
        { error: ERROR_INVALID_CREDENTIALS },
        { status: STATUS_UNAUTHORIZED, headers: corsHeaders(origin) }
      );
    }

    // 5. Return success - session cookies are automatically handled by SSR client
    return NextResponse.json(
      { session },
      { status: STATUS_OK, headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('SignIn Route Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}