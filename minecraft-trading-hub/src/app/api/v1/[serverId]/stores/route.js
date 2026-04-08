import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_CREATED,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
  ERROR_FORBIDDEN,
  ERROR_NOT_FOUND,
  ERROR_INTERNAL_SERVER,
  ERROR_MISSING_FIELDS,
  ALLOWED_ORIGINS_DEVELOPMENT,
  HEADER_ORIGIN,
  HEADER_AUTHORIZATION,
  AUTH_BEARER_PREFIX,
} from "@/app/lib/serverConstants";

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

async function requireReadPermission(supabase, serverId, userId, headers) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_developer")
    .eq("id", userId)
    .single();

  if (profile?.is_developer) return { is_member: true };

  const { data: permission } = await supabase
    .from("server_permissions")
    .select("is_member")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .single();

  let isMember = permission?.is_member;
  if (!isMember) {
    const { data: server } = await supabase
      .from("servers")
      .select("owner_id")
      .eq("id", serverId)
      .single();
    isMember = server?.owner_id === userId;
  }

  if (!isMember) {
    return NextResponse.json(
      { error: "User does not have correct permissions" },
      { status: STATUS_FORBIDDEN, headers }
    );
  }
  return { is_member: true };
}

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
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers }
      );
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = createAuthenticatedClient(token);
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: ERROR_UNAUTHORIZED },
        { status: STATUS_UNAUTHORIZED, headers }
      );
    }

    const { serverId } = await params;

    const permOrError = await requireReadPermission(supabase, serverId, user.id, headers);
    if (permOrError instanceof NextResponse) return permOrError;

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
      .select("id, name, server_name, description")
      .eq("server_id", serverId)
      .eq("status", "active")
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ stores }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}

export async function POST(request, { params }) {
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

    const permOrError = await requireReadPermission(supabase, serverId, user.id, headers);
    if (permOrError instanceof NextResponse) return permOrError;

    const body = await request.json().catch(() => ({}));
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: ERROR_MISSING_FIELDS }, { status: STATUS_BAD_REQUEST, headers });
    }

    // Fetch server display_name for the denormalized server_name column
    const { data: server, error: serverError } = await supabase
      .from("servers")
      .select("display_name")
      .eq("id", serverId)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    const { data: store, error: insertError } = await supabase
      .from("user_stores")
      .insert({
        server_id: serverId,
        owner_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        server_name: server.display_name,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ store }, { status: STATUS_CREATED, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
