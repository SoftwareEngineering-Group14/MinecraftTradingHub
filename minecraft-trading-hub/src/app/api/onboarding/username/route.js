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
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers: corsHeaders(origin) }
      );
    }

    const supabase = await createServerSideClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers: corsHeaders(origin) }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
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
        { status: STATUS_CONFLICT, headers: corsHeaders(origin) }
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
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    // Mirror to user_metadata so middleware can check without a DB query
    await supabase.auth.updateUser({ data: { username: username.trim() } });

    return NextResponse.json({ profile }, { status: STATUS_OK, headers: corsHeaders(origin) });
  } catch {
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}
