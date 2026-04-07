import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
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
const allowedMethods = "PATCH, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  return NextResponse.json(
    {},
    { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) }
  );
}

export async function PATCH(request, { params }) {
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

    const { serverId, requestId } = await params;

    const { data: callerPerm } = await supabase
      .from("server_permissions")
      .select("is_admin")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_developer")
      .eq("id", user.id)
      .single();

    const isPlatformAdmin = profile?.is_developer === true;
    const isServerAdmin = callerPerm?.is_admin === true;

    if (!isPlatformAdmin && !isServerAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: STATUS_FORBIDDEN, headers });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: STATUS_BAD_REQUEST, headers }
      );
    }

    const { data: existing } = await supabase
      .from("server_permissions")
      .select("id, is_member")
      .eq("id", requestId)
      .eq("server_id", serverId)
      .eq("is_member", false)
      .single();

    if (!existing) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    if (action === "approve") {
      const { data: updated, error: updateError } = await supabase
        .from("server_permissions")
        .update({ is_member: true })
        .eq("id", requestId)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
      }

      return NextResponse.json({ permission: updated }, { status: STATUS_OK, headers });
    } else {
      const { error: deleteError } = await supabase
        .from("server_permissions")
        .delete()
        .eq("id", requestId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
      }

      return NextResponse.json({ success: true }, { status: STATUS_OK, headers });
    }
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
