import { NextResponse } from "next/server";
import { corsHeaders } from "../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_CREATED,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
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
    const supabase = createAuthenticatedClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limitParam = searchParams.get("limit");

    let limit = 20;
    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: "Invalid limit parameter. Must be a positive integer." },
          { status: STATUS_BAD_REQUEST, headers }
        );
      }
    }

    let query = supabase
      .from("servers")
      .select("id, display_name, mc_version, created_at, owner_id, profiles!owner_id(username)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike("display_name", `%${search}%`);
    }

    const { data: servers, error: serversError } = await query;

    if (serversError) {
      console.error("Database error:", serversError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    // Fetch the current user's permission record for each server
    const serverIds = (servers || []).map((s) => s.id);
    let permMap = {};

    if (serverIds.length > 0) {
      const { data: perms } = await supabase
        .from("server_permissions")
        .select("server_id, is_member, status, is_admin")
        .eq("user_id", user.id)
        .in("server_id", serverIds);

      (perms || []).forEach((p) => {
        permMap[p.server_id] = p;
      });
    }

    const result = (servers || []).map((s) => ({
      ...s,
      userPermission: permMap[s.id] || (s.owner_id === user.id
        ? { is_member: true, is_admin: true, status: "approved" }
        : null),
    }));

    return NextResponse.json({ servers: result }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}

export async function POST(request) {
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

    const body = await request.json().catch(() => ({}));
    const { display_name, mc_version } = body;

    if (!display_name || !display_name.trim()) {
      return NextResponse.json({ error: ERROR_MISSING_FIELDS }, { status: STATUS_BAD_REQUEST, headers });
    }

    // Create the server
    const { data: server, error: serverError } = await supabase
      .from("servers")
      .insert({
        display_name: display_name.trim(),
        mc_version: mc_version?.trim() || null,
        owner_id: user.id,
        is_deleted: false,
      })
      .select("id, display_name, mc_version, created_at, owner_id")
      .single();

    if (serverError) {
      console.error("Server insert error:", serverError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    // Auto-add creator as admin member
    const { error: permError } = await supabase
      .from("server_permissions")
      .insert({
        server_id: server.id,
        user_id: user.id,
        is_member: true,
        is_admin: true,
        status: "approved",
      });

    if (permError) {
      console.error("Permission insert error:", permError);
      // Server was created — don't fail the request, but log it
    }

    return NextResponse.json({ server }, { status: STATUS_CREATED, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
