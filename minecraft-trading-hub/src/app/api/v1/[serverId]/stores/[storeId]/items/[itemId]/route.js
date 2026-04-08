import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../../../lib/supabaseClient";
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
const allowedMethods = "GET, DELETE, OPTIONS";
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

    const { serverId, storeId, itemId } = await params;

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_developer")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_developer) {
      const { data: permission } = await supabase
        .from("server_permissions")
        .select("is_member")
        .eq("server_id", serverId)
        .eq("user_id", user.id)
        .single();

      let isMember = permission?.is_member;
      if (!isMember) {
        const { data: server } = await supabase
          .from("servers")
          .select("owner_id")
          .eq("id", serverId)
          .single();
        isMember = server?.owner_id === user.id;
      }

      if (!isMember) {
        return NextResponse.json({ error: "User does not have correct permissions" }, { status: STATUS_FORBIDDEN, headers });
      }
    }

    // Verify the store exists and belongs to this server
    const { data: store, error: storeError } = await supabase
      .from("user_stores")
      .select("id")
      .eq("id", storeId)
      .eq("server_id", serverId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    const { data: listing, error } = await supabase
      .from("listings")
      .select("*, listing_items(*, item(*))")
      .eq("id", itemId)
      .eq("store_id", storeId)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    return NextResponse.json({ listing }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
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

    const { serverId, storeId, itemId } = await params;

    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("id", itemId)
      .eq("store_id", storeId)
      .single();
    if (!listing) return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });

    // Delete child listing_items first (FK constraint), then the listing
    await supabase.from("listing_items").delete().eq("listing_id", itemId);
    const { error: deleteError } = await supabase.from("listings").delete().eq("id", itemId);
    if (deleteError) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });

    return NextResponse.json({ success: true }, { status: STATUS_OK, headers });
  } catch {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
