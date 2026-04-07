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
const BASE_URL = `http://localhost:3000/api/v1/servers/${SERVER_ID}`;
const MOCK_USER = { id: 'admin-user-1', email: 'admin@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID });

function makeRequest(headers = DEFAULT_HEADERS) {
  return new NextRequest(BASE_URL, { method: 'DELETE', headers });
}

function mockDeveloperProfile({ is_developer = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

describe('/api/v1/servers/[serverId]', () => {
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
      const { mockSelect } = mockDeveloperProfile({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 404 if server not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      // Server lookup: .from("servers").select("id").eq("id", serverId).eq("is_deleted", false).single()
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 on successful soft delete', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      // Server exists
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      // Soft delete: .from("servers").update({is_deleted: true}).eq("id", serverId)
      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 if update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: { message: 'DB error' } });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await DELETE(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
