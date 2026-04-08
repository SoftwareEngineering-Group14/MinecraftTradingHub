import { NextRequest } from 'next/server';
import { GET, DELETE, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const STORE_ID = 'store-456';
const ITEM_ID = 'listing-789';
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/stores/${STORE_ID}/items/${ITEM_ID}`;
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID, storeId: STORE_ID, itemId: ITEM_ID });

function mockCallerProfile({ is_developer = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

function mockPermission({ is_member = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: is_member !== null ? { is_member } : null, error: null });
  const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEqServer = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServer });
  return { mockSelect };
}

function mockServerOwner({ owner_id = 'other-user' } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: owner_id ? { owner_id } : null, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

function mockStoreExists({ data = { id: STORE_ID }, error = null } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data, error });
  const mockEq2 = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEq1 = jest.fn().mockReturnValueOnce({ eq: mockEq2 });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq1 });
  return { mockSelect };
}

describe('/api/v1/[serverId]/stores/[storeId]/items/[itemId]', () => {
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
    function makeGetRequest() {
      return new NextRequest(BASE_URL, { method: 'GET', headers: DEFAULT_HEADERS });
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

    it('returns 404 if listing not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 with listing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      const { mockSelect: permSelect } = mockPermission({ is_member: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListing = { id: ITEM_ID, store_id: STORE_ID, listing_items: [] };
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: mockListing, error: null });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.listing).toEqual(mockListing);
    });

    it('platform admin bypasses membership check', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockCallerProfile({ is_developer: true });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });
      // No permission or server owner checks for admin
      const { mockSelect: storeSelect } = mockStoreExists();
      mockSupabase.from.mockReturnValueOnce({ select: storeSelect });

      const mockListing = { id: ITEM_ID, store_id: STORE_ID, listing_items: [] };
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: mockListing, error: null });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      const res = await GET(makeGetRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.listing).toEqual(mockListing);
    });
  });

  describe('DELETE', () => {
    function makeDeleteRequest() {
      return new NextRequest(BASE_URL, { method: 'DELETE', headers: DEFAULT_HEADERS });
    }

    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'DELETE', headers: { Origin: 'http://localhost:3000' } });
      const res = await DELETE(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await DELETE(makeDeleteRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a developer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: false }, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await DELETE(makeDeleteRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 404 if listing not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      // Listing lookup: .from("listings").select("id").eq("id", itemId).eq("store_id", storeId).single()
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      const res = await DELETE(makeDeleteRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 on successful delete', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      // Listing exists
      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: { id: ITEM_ID }, error: null });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      // Delete listing_items: .from("listing_items").delete().eq("listing_id", itemId)
      const mockLiDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockLiDelete = jest.fn().mockReturnValueOnce({ eq: mockLiDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockLiDelete });

      // Delete listing: .from("listings").delete().eq("id", itemId)
      const mockListingDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockListingDelete = jest.fn().mockReturnValueOnce({ eq: mockListingDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockListingDelete });

      const res = await DELETE(makeDeleteRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 if listing delete fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      const mockListingSingle = jest.fn().mockResolvedValueOnce({ data: { id: ITEM_ID }, error: null });
      const mockListingEq2 = jest.fn().mockReturnValueOnce({ single: mockListingSingle });
      const mockListingEq1 = jest.fn().mockReturnValueOnce({ eq: mockListingEq2 });
      const mockListingSelect = jest.fn().mockReturnValueOnce({ eq: mockListingEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockListingSelect });

      const mockLiDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockLiDelete = jest.fn().mockReturnValueOnce({ eq: mockLiDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockLiDelete });

      const mockListingDeleteEq = jest.fn().mockResolvedValueOnce({ error: { message: 'DB error' } });
      const mockListingDelete = jest.fn().mockReturnValueOnce({ eq: mockListingDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockListingDelete });

      const res = await DELETE(makeDeleteRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
