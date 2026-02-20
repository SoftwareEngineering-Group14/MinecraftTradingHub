import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../lib/serverFunctions";
import { supabase } from "../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_FORBIDDEN,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
  ERROR_FORBIDDEN,
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

export async function GET(request, { params }) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  const headers = corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders);

  try {
    const authHeader = request.headers.get(HEADER_AUTHORIZATION);
    if (!authHeader || !authHeader.startsWith(AUTH_BEARER_PREFIX)) {
      return NextResponse.json(
        {
          error: ERROR_UNAUTHORIZED
        },
        {
          status: STATUS_UNAUTHORIZED, headers
        });
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          error: ERROR_UNAUTHORIZED
        },
        {
          status: STATUS_UNAUTHORIZED, headers
        });
    }

    const { serverId } = await params;

    // Check the user has read access to this server
    const { data: permission } = await supabase
      .from("permissions")
      .select("can_read")
      .eq("entity_id", serverId)
      .eq("user_id", user.id)
      .single();

    // Single returns null if no record is found, so we can use that to determine if the user has any permissions for this server
    // If you user .can_read, that will throw an error if permission is null, which is why we use ?. to safely access it
    if (!permission?.can_read) {
      return NextResponse.json({ error: "User does not have correct permissions" }, { status: STATUS_FORBIDDEN, headers });
    }

    let limit = 10;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: "Invalid limit parameter. Must be a positive integer." },
          { status: STATUS_BAD_REQUEST, headers }
        );
      }
    }

    const { data: stores, error } = await supabase
      .from("user_stores")
      .select("id, server_name, description")
      .eq("server_id", serverId)
      .eq("status", "active")
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ stores }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: ERROR_INTERNAL_SERVER,
      },
      {
        status: STATUS_INTERNAL_SERVER_ERROR, headers
      });
  }
}
