import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../lib/supabaseClient";
import {
  STATUS_OK,
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
const allowedMethods = "DELETE, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  return NextResponse.json({}, { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) });
}

export async function DELETE(request, { params }) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  const headers = corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders);
  try {
    const authHeader = request.headers.get(HEADER_AUTHORIZATION);
    if (!authHeader?.startsWith(AUTH_BEARER_PREFIX)) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }
    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = createAuthenticatedClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });

    const { data: profile } = await supabase.from("profiles").select("is_developer").eq("id", user.id).single();
    if (!profile?.is_developer) return NextResponse.json({ error: "Admin access required" }, { status: STATUS_FORBIDDEN, headers });

    const { serverId } = await params;
    const { data: server } = await supabase.from("servers").select("id").eq("id", serverId).eq("is_deleted", false).single();
    if (!server) return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });

    const { error: deleteError } = await supabase.from("servers").update({ is_deleted: true }).eq("id", serverId);
    if (deleteError) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });

    return NextResponse.json({ success: true }, { status: STATUS_OK, headers });
  } catch {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
