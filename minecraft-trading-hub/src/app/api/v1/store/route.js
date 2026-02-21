import { NextResponse } from "next/server";
import { handleOptions, authenticateRequest } from "../../../lib/serverFunctions";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_INTERNAL_SERVER,
  ALLOWED_ORIGINS_DEVELOPMENT,
  HEADER_ORIGIN,
  HEADER_AUTHORIZATION,
  AUTH_BEARER_PREFIX,
  STATUS_UNAUTHORIZED,
  ERROR_UNAUTHORIZED,
} from "@/app/lib/serverConstants";

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  return handleOptions(request, allowedOrigins, allowedMethods, allowedHeaders, HEADER_ORIGIN);
}

export async function GET(request) {
  const authResult = await authenticateRequest(request, {
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    headerOrigin: HEADER_ORIGIN,
    headerAuthorization: HEADER_AUTHORIZATION,
    authBearerPrefix: AUTH_BEARER_PREFIX,
    statusUnauthorized: STATUS_UNAUTHORIZED,
    errorUnauthorized: ERROR_UNAUTHORIZED,
  });

  if (authResult.error) {
    return authResult.error;
  }

  const { user, supabase, headers } = authResult;

  try {

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");

    let limit = 10;
    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: "Invalid limit parameter. Must be a positive integer." },
          { status: STATUS_BAD_REQUEST, headers }
        );
      }
      limit = Math.min(limit, 100);
    }

    const { data: stores, error } = await supabase
      .from("user_stores")
      .select("*")
      .eq("owner_id", user.id)
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ stores }, { status: STATUS_OK, headers });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
