import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_CREATED,
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
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = createAuthenticatedClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const { serverId, storeId } = await params;

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

    let limit = 25;
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

    const { data: listings, error } = await supabase
      .from("listings")
      .select("*, listing_items(*, item(*))")
      .eq("store_id", storeId)
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ listings }, { status: STATUS_OK, headers });
  } catch (error) {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}

export async function POST(request, { params }) {
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

    const { serverId, storeId } = await params;

    const { data: permission } = await supabase
      .from("server_permissions")
      .select("is_member")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    let isMember = permission?.is_member;
    if (!isMember) {
      const { data: server } = await supabase.from("servers").select("owner_id").eq("id", serverId).single();
      isMember = server?.owner_id === user.id;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_developer")
      .eq("id", user.id)
      .single();

    const isDeveloper = profile?.is_developer === true;

    if (!isMember && !isDeveloper) {
      return NextResponse.json({ error: "User does not have correct permissions" }, { status: STATUS_FORBIDDEN, headers });
    }

    const { data: store } = await supabase.from("user_stores").select("id").eq("id", storeId).eq("server_id", serverId).single();
    if (!store) return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });

    const body = await request.json().catch(() => ({}));
    const { name, quantity, cost } = body;
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: STATUS_BAD_REQUEST, headers });

    // Create the listing row (only store_id — no name/quantity/cost on listings table)
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({ store_id: storeId })
      .select()
      .single();
    if (listingError || !listing) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });

    // Find or create item by name
    let itemId;
    const { data: existingItem } = await supabase.from("item").select("id").eq("name", name.trim()).single();
    if (existingItem) {
      itemId = existingItem.id;
    } else {
      const { data: newItem, error: itemError } = await supabase.from("item").insert({ name: name.trim() }).select("id").single();
      if (itemError || !newItem) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
      itemId = newItem.id;
    }

    // Create listing_items row linking listing → item with quantity and cost
    const { error: liError } = await supabase.from("listing_items").insert({
      listing_id: listing.id,
      item_id: itemId,
      quantity: quantity ? parseInt(quantity, 10) : null,
      cost: cost != null ? parseInt(cost, 10) : null,
      is_selling_not_recieving: true,
    });
    if (liError) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });

    // Return full listing with joins for the UI
    const { data: fullListing, error: fetchError } = await supabase
      .from("listings")
      .select("*, listing_items(*, item(*))")
      .eq("id", listing.id)
      .single();
    if (fetchError || !fullListing) return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });

    return NextResponse.json({ listing: fullListing }, { status: STATUS_CREATED, headers });
  } catch {
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
