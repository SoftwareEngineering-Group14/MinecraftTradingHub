import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../purchase/route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const STORE_ID = 'store-456';
const LISTING_ID = 'listing-789';
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/stores/${STORE_ID}/items/${LISTING_ID}/purchase`;
const BUYER_USER = { id: 'buyer-111' };
const SELLER_USER_ID = 'seller-222';
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID, storeId: STORE_ID, itemId: LISTING_ID });

function makePostRequest(body = {}) {
  return new NextRequest(BASE_URL, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });
}

describe('/api/v1/[serverId]/stores/[storeId]/items/[listingId]/purchase', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(),
    };
    createAuthenticatedClient.mockReturnValue(mockSupabase);
  });

  describe('OPTIONS', () => {
    it('returns 200 with CORS headers', async () => {
      const req = new NextRequest(BASE_URL, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } });
      const res = await OPTIONS(req);
      expect(res.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'POST', headers: { Origin: 'http://localhost:3000' } });
      const res = await POST(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await POST(makePostRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a server member', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // caller profile: not developer
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: false }, error: null }),
          }),
        }),
      });
      // permission: not member
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { is_member: false }, error: null }),
            }),
          }),
        }),
      });
      // server owner check: different owner
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { owner_id: 'other-user' }, error: null }),
          }),
        }),
      });

      const res = await POST(makePostRequest(), { params: PARAMS });
      expect(res.status).toBe(403);
    });

    it('returns 400 if buyer tries to purchase from their own store', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // caller profile: developer (bypass membership)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null }),
          }),
        }),
      });
      // store: owned by the buyer
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID, owner_id: BUYER_USER.id }, error: null }),
            }),
          }),
        }),
      });

      const res = await POST(makePostRequest({ quantity: 1 }), { params: PARAMS });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/own store/i);
    });

    it('returns 400 if requested quantity exceeds available stock', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // developer bypass
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null }),
          }),
        }),
      });
      // store: owned by seller
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID, owner_id: SELLER_USER_ID }, error: null }),
            }),
          }),
        }),
      });
      // listing: quantity 5
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: LISTING_ID, listing_items: [{ id: 'li-1', item_id: 'item-1', quantity: 5, cost: 10 }] },
                error: null,
              }),
            }),
          }),
        }),
      });

      const res = await POST(makePostRequest({ quantity: 10 }), { params: PARAMS });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/exceeds available stock/i);
    });

    it('returns 400 if buyer has insufficient coins', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // developer bypass
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null }),
          }),
        }),
      });
      // store
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID, owner_id: SELLER_USER_ID }, error: null }),
            }),
          }),
        }),
      });
      // listing: 10 stock at 50 coins/unit
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: LISTING_ID, listing_items: [{ id: 'li-1', item_id: 'item-1', quantity: 10, cost: 50 }] },
                error: null,
              }),
            }),
          }),
        }),
      });
      // buyer profile: only 30 coins; needs 3 * 50 = 150
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { coins: 30 }, error: null }),
          }),
        }),
      });

      const res = await POST(makePostRequest({ quantity: 3 }), { params: PARAMS });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/insufficient coins/i);
    });

    it('partial purchase reduces stock and does not delete listing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // developer bypass
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null }),
          }),
        }),
      });
      // store
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID, owner_id: SELLER_USER_ID }, error: null }),
            }),
          }),
        }),
      });
      // listing: 10 stock at 20 coins/unit
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: LISTING_ID, listing_items: [{ id: 'li-1', item_id: 'item-1', quantity: 10, cost: 20 }] },
                error: null,
              }),
            }),
          }),
        }),
      });
      // buyer profile: 500 coins
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { coins: 500 }, error: null }),
          }),
        }),
      });
      // deduct buyer coins
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });
      // seller profile
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { coins: 100 }, error: null }),
          }),
        }),
      });
      // credit seller coins
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });
      // inventory lookup: no existing item
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
            }),
          }),
        }),
      });
      // inventory insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({ error: null }),
      });
      // update listing_items quantity (partial — not deleting)
      const updateEq = jest.fn().mockResolvedValueOnce({ error: null });
      const updateFn = jest.fn().mockReturnValueOnce({ eq: updateEq });
      mockSupabase.from.mockReturnValueOnce({ update: updateFn });

      const res = await POST(makePostRequest({ quantity: 3 }), { params: PARAMS });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.coinsSpent).toBe(60); // 3 * 20
      expect(body.newBalance).toBe(440); // 500 - 60
      expect(body.listingDeleted).toBe(false);
      // Verify stock was updated not deleted
      expect(updateFn).toHaveBeenCalledWith({ quantity: 7 }); // 10 - 3
    });

    it('full purchase deletes listing when stock is exhausted', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: BUYER_USER }, error: null });

      // developer bypass
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null }),
          }),
        }),
      });
      // store
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID, owner_id: SELLER_USER_ID }, error: null }),
            }),
          }),
        }),
      });
      // listing: 5 stock at 10 coins/unit
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: LISTING_ID, listing_items: [{ id: 'li-1', item_id: 'item-1', quantity: 5, cost: 10 }] },
                error: null,
              }),
            }),
          }),
        }),
      });
      // buyer profile: 200 coins
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { coins: 200 }, error: null }),
          }),
        }),
      });
      // deduct buyer coins
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) }),
      });
      // seller profile
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({ data: { coins: 50 }, error: null }),
          }),
        }),
      });
      // credit seller
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) }),
      });
      // inventory lookup: existing item with qty 2
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({ data: { id: 'inv-1', quantity: 2 }, error: null }),
            }),
          }),
        }),
      });
      // update inventory quantity: 2 + 5 = 7
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) }),
      });
      // delete listing_items
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) }),
      });
      // delete listing
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) }),
      });

      const res = await POST(makePostRequest({ quantity: 5 }), { params: PARAMS });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.coinsSpent).toBe(50); // 5 * 10
      expect(body.newBalance).toBe(150); // 200 - 50
      expect(body.listingDeleted).toBe(true);
    });
  });
});
