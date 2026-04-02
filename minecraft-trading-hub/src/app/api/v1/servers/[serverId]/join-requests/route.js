import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_UNAUTHORIZED,
  STATUS_FORBIDDEN,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
  ERROR_INTERNAL_SERVER,
  ALLOWED_ORIGINS_DEVELOPMENT,
  HEADER_ORIGIN,
  HEADER_AUTHORIZATION,
  AUTH_BEARER_PREFIX,
} from "@/app/lib/serverConstants";

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = "GET, OPTIONS";
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
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = createAuthenticatedClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const { serverId } = await params;

    // Must be a server admin or platform admin
    const { data: callerPerm } = await supabase
      .from("server_permissions")
      .select("is_admin")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isPlatformAdmin = profile?.role === "admin";
    const isServerAdmin = callerPerm?.is_admin === true;

    if (!isPlatformAdmin && !isServerAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: STATUS_FORBIDDEN, headers });
    }

    const { data: requests, error } = await supabase
      .from("server_permissions")
      .select("id, user_id, status, is_member, profiles!user_id(username, name)")
      .eq("server_id", serverId)
      .eq("status", "pending");

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ requests }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
