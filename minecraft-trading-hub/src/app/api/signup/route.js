import { NextResponse } from 'next/server';
import { isOriginAllowed } from '../../lib/serverFunctions';
import { signUp } from '../../lib/auth';
import {
  HEADER_ORIGIN,
  HEADER_ACCESS_CONTROL_ALLOW_METHODS,
  HEADER_ACCESS_CONTROL_ALLOW_HEADERS,
  HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_CREATED,
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
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
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers: corsHeaders(origin) }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: ERROR_MISSING_FIELDS },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    const { user, profile, error } = await signUp(email, password, name);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { user, profile },
      { status: STATUS_CREATED, headers: corsHeaders(origin) }
    );
  } catch (error) {
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin) }
    );
  }
}
