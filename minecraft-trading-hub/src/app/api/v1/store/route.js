import { NextResponse } from "next/server";
import { corsHeaders } from "../../../lib/serverFunctions";
import { createServerSideClient } from "../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
  ERROR_INTERNAL_SERVER,
  ALLOWED_ORIGINS_DEVELOPMENT,
  HEADER_ORIGIN,
  HEADER_AUTHORIZATION,
  AUTH_BEARER_PREFIX,
} from "@/app/lib/serverConstants";

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  return NextResponse.json(
    {},
    { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) }
  );
}

export async function GET(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  const headers = corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders);

  try {
    const authHeader = request.headers.get(HEADER_AUTHORIZATION);
    if (!authHeader || !authHeader.startsWith(AUTH_BEARER_PREFIX)) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = await createServerSideClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

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
