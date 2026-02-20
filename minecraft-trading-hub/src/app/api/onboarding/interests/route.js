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
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ERROR_UNAUTHORIZED,
  INTEREST_OPTIONS,
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
    const { interests } = body;

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    const validInterests = interests.filter(i => INTEREST_OPTIONS.includes(i));
    if (validInterests.length === 0) {
      return NextResponse.json(
        { error: 'No valid interests provided' },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ interests: validInterests })
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
    await supabase.auth.updateUser({ data: { interests: validInterests } });

    return NextResponse.json({ profile }, { status: STATUS_OK, headers: corsHeaders(origin) });
  } catch {
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}
