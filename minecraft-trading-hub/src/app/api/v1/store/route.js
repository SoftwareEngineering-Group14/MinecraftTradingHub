import { NextResponse } from "next/server";
import { corsHeaders, isOriginAllowed } from "../../../lib/serverFunctions";
import { supabase } from "../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_FORBIDDEN,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_INTERNAL_SERVER,
  ERROR_ORIGIN_NOT_ALLOWED,
  ERROR_UNAUTHORIZED,
  ALLOWED_ORIGINS_DEVELOPMENT,
  METHOD_GET,
  METHOD_POST,
  METHOD_OPTIONS,
  HEADER_CONTENT_TYPE,
  HEADER_AUTHORIZATION,
  HEADER_ORIGIN,
  AUTH_BEARER_PREFIX,
} from "@/app/lib/serverConstants";

// Allowed Origins: http://localhost:3000, http://localhost:3001
const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;

// This is a pre-check for CORS preflight requests. It responds to OPTIONS requests with the appropriate CORS headers.
export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || '';
  return NextResponse.json(
    {},
    { headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
  );
}

// GET handler to fetch stores with optional limit parameter
export async function GET(request) {
  try {
    const origin = request.headers.get(HEADER_ORIGIN) || '';

    // Validate origin
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return NextResponse.json(
        { error: ERROR_ORIGIN_NOT_ALLOWED },
        { status: STATUS_FORBIDDEN, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
      );
    }

    // Verify authentication token
    const authHeader = request.headers.get(HEADER_AUTHORIZATION);
    if (!authHeader) {
      return NextResponse.json(
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
      );
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith(AUTH_BEARER_PREFIX)
      ? authHeader.substring(AUTH_BEARER_PREFIX.length)
      : authHeader;

    // Verify token with Supabase using the existing singleton client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
      );
    }

    // Extract limit from query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');

    // Default limit to 10 if not provided, validate if provided
    let limit = 10;
    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be a positive integer.' },
          { status: STATUS_BAD_REQUEST, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
        );
      }
      // Cap the limit at 100 to prevent excessive queries
      limit = Math.min(limit, 100);
    }

    // Fetch stores from Supabase filtered by the authenticated user's ID
    const { data: stores, error } = await supabase
      .from('user_stores')
      .select('*')
      .eq('owner_id', user.id)
      .limit(limit);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: ERROR_INTERNAL_SERVER },
        { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
      );
    }

    return NextResponse.json(
      { stores, count: stores.length },
      { status: STATUS_OK, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
    );
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: ERROR_INTERNAL_SERVER },
      { status: STATUS_INTERNAL_SERVER_ERROR, headers: corsHeaders(origin, allowedOrigins, `${METHOD_GET}, ${METHOD_POST}, ${METHOD_OPTIONS}`, `${HEADER_CONTENT_TYPE}, ${HEADER_AUTHORIZATION}`) }
    );
  }
}
