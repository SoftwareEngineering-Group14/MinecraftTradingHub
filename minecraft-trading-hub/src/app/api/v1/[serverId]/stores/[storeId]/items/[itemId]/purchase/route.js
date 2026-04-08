import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../../../../../lib/serverFunctions";
import { createAuthenticatedClient } from "../../../../../../../../lib/supabaseClient";
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
const allowedMethods = "POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

export async function OPTIONS(request) {
  const origin = request.headers.get(HEADER_ORIGIN) || "";
  return NextResponse.json({}, { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) });
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
    if (authError || !user) {
      return NextResponse.json({ error: ERROR_UNAUTHORIZED }, { status: STATUS_UNAUTHORIZED, headers });
    }

    const { serverId, storeId, itemId: listingId } = await params;

    // Platform admins bypass membership check
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
        const { data: server } = await supabase.from("servers").select("owner_id").eq("id", serverId).single();
        isMember = server?.owner_id === user.id;
      }
      if (!isMember) {
        return NextResponse.json({ error: "You must be a server member to purchase" }, { status: STATUS_FORBIDDEN, headers });
      }
    }

    // Get the store and its owner
    const { data: store } = await supabase
      .from("user_stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .eq("server_id", serverId)
      .single();
    if (!store) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    if (store.owner_id === user.id) {
      return NextResponse.json({ error: "You cannot purchase from your own store" }, { status: STATUS_BAD_REQUEST, headers });
    }

    // Get the listing and its items
    const { data: listing } = await supabase
      .from("listings")
      .select("id, listing_items(id, item_id, quantity, cost)")
      .eq("id", listingId)
      .eq("store_id", storeId)
      .single();
    if (!listing) {
      return NextResponse.json({ error: ERROR_NOT_FOUND }, { status: STATUS_NOT_FOUND, headers });
    }

    const listingItems = listing.listing_items || [];
    const totalCost = listingItems.reduce((sum, li) => sum + (li.cost ?? 0), 0);

    // Check buyer's coin balance
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single();
    if (!buyerProfile || (buyerProfile.coins ?? 0) < totalCost) {
      return NextResponse.json(
        { error: `Insufficient coins. Need ${totalCost}, have ${buyerProfile?.coins ?? 0}.` },
        { status: STATUS_BAD_REQUEST, headers }
      );
    }

    // Deduct coins from buyer
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ coins: (buyerProfile.coins ?? 0) - totalCost })
      .eq("id", user.id);
    if (deductError) {
      console.error("Coin deduction error:", deductError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    // Add coins to seller
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", store.owner_id)
      .single();
    const { error: creditError } = await supabase
      .from("profiles")
      .update({ coins: (sellerProfile?.coins ?? 0) + totalCost })
      .eq("id", store.owner_id);
    if (creditError) {
      console.error("Seller coin credit error:", creditError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    // Add items to buyer's inventory
    for (const li of listingItems) {
      const { data: existing, error: existingError } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("owner_id", user.id)
        .eq("item_id", li.item_id)
        .maybeSingle();

      if (existingError) {
        console.error("Inventory lookup error:", existingError);
        return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
      }

      if (existing) {
        const { error: updateInvError } = await supabase
          .from("inventory_items")
          .update({ quantity: existing.quantity + (li.quantity ?? 1) })
          .eq("id", existing.id);
        if (updateInvError) {
          console.error("Inventory update error:", updateInvError);
          return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
        }
      } else {
        const { error: insertInvError } = await supabase
          .from("inventory_items")
          .insert({ owner_id: user.id, item_id: li.item_id, quantity: li.quantity ?? 1 });
        if (insertInvError) {
          console.error("Inventory insert error:", insertInvError);
          return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
        }
      }
    }

    // Delete the listing (listing_items rows first due to FK, then the listing)
    const { error: listingItemsDeleteError } = await supabase.from("listing_items").delete().eq("listing_id", listingId);
    if (listingItemsDeleteError) {
      console.error("Listing items delete error:", listingItemsDeleteError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    const { error: listingDeleteError } = await supabase.from("listings").delete().eq("id", listingId);
    if (listingDeleteError) {
      console.error("Listing delete error:", listingDeleteError);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json(
      { success: true, coinsSpent: totalCost, newBalance: (buyerProfile.coins ?? 0) - totalCost },
      { status: STATUS_OK, headers }
    );
  } catch (err) {
    console.error("Purchase error:", err);
    return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
  }
}
