import { NextRequest } from 'next/server';
import { GET, POST, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const STORE_ID = 'store-456';
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/stores/${STORE_ID}/items`;
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID, storeId: STORE_ID });

// Mock: .from("profiles").select("is_developer").eq("id", userId).single()
function mockCallerProfile({ is_developer = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

// Mock: .from("server_permissions").select("is_member").eq().eq().single()
function mockPermission({ is_member = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: is_member !== null ? { is_member } : null, error: null });
  const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEqServer = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServer });
  return { mockSelect };
}

// Mock: .from("servers").select("owner_id").eq("id", serverId).single()
function mockServerOwner({ owner_id = 'other-user' } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: owner_id ? { owner_id } : null, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

// Mock: .from("user_stores").select("id").eq("id", storeId).eq("server_id", serverId).single()
function mockStoreExists({ data = { id: STORE_ID }, error = null } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data, error });
  const mockEq2 = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEq1 = jest.fn().mockReturnValueOnce({ eq: mockEq2 });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq1 });
  return { mockSelect };
}

describe('/api/v1/[serverId]/stores/[storeId]/items', () => {
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

  describe('GET', () => {
    function makeGetRequest(url = BASE_URL) {
      return new NextRequest(url, { method: 'GET', headers: DEFAULT_HEADERS });
    }

    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { Origin: 'http://localhost:3000' } });
      const res = await GET(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a member and not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: serverSelect } = mockServerOwner({ owner_id: 'other-user' });
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('returns 403 if permission record is null and not owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: null });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: serverSelect } = mockServerOwner({ owner_id: 'other-user' });
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(403);
    });

    it('returns 404 if store not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists({ data: null, error: { message: 'Not found' } });
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 400 if limit is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const res = await GET(makeGetRequest(`${BASE_URL}?limit=abc`), { params: PARAMS });
      expect(res.status).toBe(400);
    });

    it('returns 200 with listings', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListings = [{ id: 'listing-1', store_id: STORE_ID }];
      const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockListings, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.listings).toEqual(mockListings);
    });

    it('returns 200 as server owner even without permission record', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: serverSelect } = mockServerOwner({ owner_id: MOCK_USER.id });
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(200);
    });

    it('returns 500 if listings query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockLimit = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockEq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });

    it('platform admin bypasses membership check and accesses listings', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile({ is_developer: true });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      // No permission or server owner checks for admin
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListings = [{ id: 'listing-1', store_id: STORE_ID }];
      const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockListings, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.listings).toEqual(mockListings);
    });
  });

  describe('POST', () => {
    function makePostRequest(body = {}) {
      return new NextRequest(BASE_URL, {
        method: 'POST',
        headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'POST', headers: { Origin: 'http://localhost:3000' } });
      const res = await POST(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await POST(makePostRequest({ name: 'Item' }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a member', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: serverSelect } = mockServerOwner({ owner_id: 'other-user' });
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const res = await POST(makePostRequest({ name: 'Item' }), { params: PARAMS });
      expect(res.status).toBe(403);
    });

    it('returns 404 if store not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: storeSelect } = mockStoreExists({ data: null, error: null });
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const res = await POST(makePostRequest({ name: 'Item' }), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 400 if name is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const res = await POST(makePostRequest({}), { params: PARAMS });
      expect(res.status).toBe(400);
    });

    it('returns 201 with existing item', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      // Insert listing: .from("listings").insert({store_id}).select().single()
      const mockListing = { id: 'listing-new', store_id: STORE_ID };
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: mockListing, error: null });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingInsert = jest.fn().mockReturnValueOnce({ select: mockListingSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockListingInsert });

      // Find existing item: .from("item").select("id").eq("name", name).single()
      const mockItemSingle = jest.fn().mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
      const mockItemEq = jest.fn().mockReturnValueOnce({ single: mockItemSingle });
      const mockItemSelect = jest.fn().mockReturnValueOnce({ eq: mockItemEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockItemSelect });

      // Insert listing_items: .from("listing_items").insert({...})
      const mockLiInsert = jest.fn().mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValueOnce({ insert: mockLiInsert });

      // Fetch full listing: .from("listings").select(...).eq("id", listing.id).single()
      const fullListing = { id: 'listing-new', store_id: STORE_ID, listing_items: [] };
      const mockFullSingle = jest.fn().mockResolvedValueOnce({ data: fullListing, error: null });
      const mockFullEq = jest.fn().mockReturnValueOnce({ single: mockFullSingle });
      const mockFullSelect = jest.fn().mockReturnValueOnce({ eq: mockFullEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockFullSelect });

      const res = await POST(makePostRequest({ name: 'Diamond', quantity: 5, cost: 10 }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.listing).toEqual(fullListing);
    });

    it('returns 201 creating new item when none exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      // Insert listing
      const mockListing = { id: 'listing-new', store_id: STORE_ID };
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: mockListing, error: null });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingInsert = jest.fn().mockReturnValueOnce({ select: mockListingSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockListingInsert });

      // No existing item found
      const mockItemSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockItemEq = jest.fn().mockReturnValueOnce({ single: mockItemSingle });
      const mockItemSelect = jest.fn().mockReturnValueOnce({ eq: mockItemEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockItemSelect });

      // Create new item: .from("item").insert({name}).select("id").single()
      const mockNewItemSingle = jest.fn().mockResolvedValueOnce({ data: { id: 'item-new' }, error: null });
      const mockNewItemSelect = jest.fn().mockReturnValueOnce({ single: mockNewItemSingle });
      const mockNewItemInsert = jest.fn().mockReturnValueOnce({ select: mockNewItemSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockNewItemInsert });

      // Insert listing_items
      const mockLiInsert = jest.fn().mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValueOnce({ insert: mockLiInsert });

      // Fetch full listing
      const fullListing = { id: 'listing-new', store_id: STORE_ID, listing_items: [] };
      const mockFullSingle = jest.fn().mockResolvedValueOnce({ data: fullListing, error: null });
      const mockFullEq = jest.fn().mockReturnValueOnce({ single: mockFullSingle });
      const mockFullSelect = jest.fn().mockReturnValueOnce({ eq: mockFullEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockFullSelect });

      const res = await POST(makePostRequest({ name: 'Emerald' }), { params: PARAMS });
      expect(res.status).toBe(201);
    });

    it('returns 500 if listing insert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingInsert = jest.fn().mockReturnValueOnce({ select: mockListingSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockListingInsert });

      const res = await POST(makePostRequest({ name: 'Diamond' }), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
