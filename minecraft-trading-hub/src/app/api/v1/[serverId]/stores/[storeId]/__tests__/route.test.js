import { NextRequest } from 'next/server';
import { DELETE, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const STORE_ID = 'store-456';
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/stores/${STORE_ID}`;
const MOCK_USER = { id: 'admin-user-1', email: 'admin@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID, storeId: STORE_ID });

function makeRequest(headers = DEFAULT_HEADERS) {
  return new NextRequest(BASE_URL, { method: 'DELETE', headers });
}

describe('/api/v1/[serverId]/stores/[storeId]', () => {
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

  describe('DELETE', () => {
    it('returns 401 if no authorization header', async () => {
      const res = await DELETE(makeRequest({ Origin: 'http://localhost:3000' }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await DELETE(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a developer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: false }, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 404 if store not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Developer profile check
      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      // Store lookup: .from("user_stores").select("id").eq("id", storeId).eq("server_id", serverId).single()
      const mockStoreSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockStoreEq2 = jest.fn().mockReturnValueOnce({ single: mockStoreSingle });
      const mockStoreEq1 = jest.fn().mockReturnValueOnce({ eq: mockStoreEq2 });
      const mockStoreSelect = jest.fn().mockReturnValueOnce({ eq: mockStoreEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockStoreSelect });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 on successful delete', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Developer profile
      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      // Store exists
      const mockStoreSingle = jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID }, error: null });
      const mockStoreEq2 = jest.fn().mockReturnValueOnce({ single: mockStoreSingle });
      const mockStoreEq1 = jest.fn().mockReturnValueOnce({ eq: mockStoreEq2 });
      const mockStoreSelect = jest.fn().mockReturnValueOnce({ eq: mockStoreEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockStoreSelect });

      // Delete: .from("user_stores").delete().eq("id", storeId)
      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockDelete = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockDelete });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 if delete query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockProfileSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer: true }, error: null });
      const mockProfileEq = jest.fn().mockReturnValueOnce({ single: mockProfileSingle });
      const mockProfileSelect = jest.fn().mockReturnValueOnce({ eq: mockProfileEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockProfileSelect });

      const mockStoreSingle = jest.fn().mockResolvedValueOnce({ data: { id: STORE_ID }, error: null });
      const mockStoreEq2 = jest.fn().mockReturnValueOnce({ single: mockStoreSingle });
      const mockStoreEq1 = jest.fn().mockReturnValueOnce({ eq: mockStoreEq2 });
      const mockStoreSelect = jest.fn().mockReturnValueOnce({ eq: mockStoreEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockStoreSelect });

      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: { message: 'DB error' } });
      const mockDelete = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockDelete });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
