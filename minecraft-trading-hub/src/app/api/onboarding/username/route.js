import { NextResponse } from 'next/server';
import { createServerSideClient } from '../../../lib/supabaseClient';
import { isOriginAllowed, corsHeaders } from '../../../lib/serverFunctions';
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
  STATUS_CONFLICT,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ERROR_UNAUTHORIZED,
  ALLOWED_ORIGINS_DEVELOPMENT,
} from '../../../lib/serverConstants';

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = 'POST, OPTIONS';
const allowedHeaders = 'Content-Type, Authorization';

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  return NextResponse.json({}, { headers: corsHeaders(origin, allowedMethods, allowedHeaders) });
}

export async function POST(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  const headers = corsHeaders(origin, allowedMethods, allowedHeaders);

  try {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers }
      );
    }

    const supabase = await createServerSideClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers }
      );
    }

    // Check username is not already taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: STATUS_CONFLICT, headers }
      );
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: STATUS_BAD_REQUEST, headers }
      );
    }

    await supabase.auth.updateUser({ data: { username: username.trim() } });

    return NextResponse.json({ profile }, { status: STATUS_OK, headers });
  } catch {
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers }
    );
  }
}
