import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_UNAUTHORIZED,
  STATUS_NOT_FOUND,
  STATUS_CONFLICT,
  STATUS_INTERNAL_SERVER_ERROR,
  ERROR_UNAUTHORIZED,
  ERROR_NOT_FOUND,
  ERROR_INTERNAL_SERVER,
  ALLOWED_ORIGINS_DEVELOPMENT,
  HEADER_ORIGIN,
  HEADER_AUTHORIZATION,
  AUTH_BEARER_PREFIX,
} from "@/app/lib/serverConstants";

const allowedOrigins = ALLOWED_ORIGINS_DEVELOPMENT;
const allowedMethods = "POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  return NextResponse.json(
    {},
    { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) }
  );
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

    // Verify server exists and is not deleted
    const { data: server, error: serverError } = await supabase
      .from("servers")
      .select("id")
      .eq("id", serverId)
      .eq("is_deleted", false)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    // Check if a permission record already exists
    const { data: existing } = await supabase
      .from("server_permissions")
      .select("id, is_member, status")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      if (existing.is_member) {
        return NextResponse.json({ error: "Already a member of this server" }, { status: STATUS_CONFLICT, headers });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Join request already pending" }, { status: STATUS_CONFLICT, headers });
      }
      // Rejected — allow re-request by updating the existing record
      const { data: updated, error: updateError } = await supabase
        .from("server_permissions")
        .update({ status: "pending", is_member: false })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
      }
      return NextResponse.json({ permission: updated }, { status: STATUS_OK, headers });
    }

    // Create new pending join request
    const { data: permission, error: insertError } = await supabase
      .from("server_permissions")
      .insert({ server_id: serverId, user_id: user.id, is_member: false, is_admin: false, status: "pending" })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ permission }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
