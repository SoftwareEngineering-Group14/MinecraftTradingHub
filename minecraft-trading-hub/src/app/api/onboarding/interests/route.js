import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/app/lib/supabaseClient';
import { isOriginAllowed, corsHeaders } from '@/app/lib/serverFunctions';
import {
  HEADER_ORIGIN,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_INTERNAL_SERVER,
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

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return NextResponse.json(
      { error: ERROR_ORIGIN_NOT_ALLOWED },
      { status: STATUS_FORBIDDEN, headers: getHeaders() }
    );
  }

  try {
    const supabase = await createServerSideClient();

    const body = await request.json();
    const { interests } = body;

    if (!interests || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'Interests must be an array of selected tags.' },
        { status: STATUS_BAD_REQUEST, headers: getHeaders() }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getHeaders() }
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        interests: interests,
      })
      .eq('id', session.user.id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Interests updated successfully' },
      { status: STATUS_OK, headers: getHeaders() }
    );

  } catch (error) {
    console.error('Interests API Error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: getHeaders() }
    );
  }
}