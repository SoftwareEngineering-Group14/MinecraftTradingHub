import { NextResponse } from "next/server";
import { corsHeaders } from "../../../../lib/serverFunctions";
import { createServerSideClient } from "../../../../lib/supabaseClient";
import {
  STATUS_OK,
  STATUS_BAD_REQUEST,
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
const allowedMethods = "GET, POST, OPTIONS";
const allowedHeaders = "Content-Type, Authorization";

const VALID_CATEGORIES = ["food", "weapon", "tool", "armor", "potion", "enchantments", "misc"];

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
      return NextResponse.json(
        {
          error: ERROR_UNAUTHORIZED
        },
        {
          status: STATUS_UNAUTHORIZED, headers
        });
    }

    const token = authHeader.substring(AUTH_BEARER_PREFIX.length);
    const supabase = await createServerSideClient();
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

    if (!permission?.can_read) {
      return NextResponse.json({ error: "User does not have correct permissions" }, { status: STATUS_FORBIDDEN, headers });
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

    const body = await request.json().catch(() => ({}));
    const { storeId, listingName, listingQuantity, listingCategory, minPrice, maxPrice } = body;

    if (listingCategory !== undefined && !VALID_CATEGORIES.includes(listingCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: STATUS_BAD_REQUEST, headers }
      );
    }

    let query = supabase
      .from("listings")
      .select("*")
      .eq("server_id", serverId);

    if (storeId !== undefined) query = query.eq("store_id", storeId);
    if (listingName !== undefined) query = query.ilike("name", `%${listingName}%`);
    if (listingQuantity !== undefined) query = query.eq("quantity", listingQuantity);
    if (listingCategory !== undefined) query = query.eq("category", listingCategory);
    if (minPrice !== undefined) query = query.gte("price", minPrice);
    if (maxPrice !== undefined) query = query.lte("price", maxPrice);

    query = query.limit(limit);

    const { data: listings, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: ERROR_INTERNAL_SERVER }, { status: STATUS_INTERNAL_SERVER_ERROR, headers });
    }

    return NextResponse.json({ listings }, { status: STATUS_OK, headers });
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
