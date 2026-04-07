import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const BASE_URL = `http://localhost:3000/api/v1/servers/${SERVER_ID}/join`;
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID });

function makeRequest(headers = DEFAULT_HEADERS) {
  return new NextRequest(BASE_URL, { method: 'POST', headers });
}

describe('/api/v1/servers/[serverId]/join', () => {
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
      const res = await POST(makeRequest({ Origin: 'http://localhost:3000' }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if auth header missing Bearer prefix', async () => {
      const req = new NextRequest(BASE_URL, { method: 'POST', headers: { ...DEFAULT_HEADERS, Authorization: 'invalid' } });
      const res = await POST(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await POST(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 404 if server not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Server lookup: .from("servers").select("id").eq("id", serverId).eq("is_deleted", false).single()
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      const res = await POST(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 409 if user is already a member', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Server exists
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      // Existing permission: is_member = true
      const mockExistSingle = jest.fn().mockResolvedValueOnce({ data: { id: 'perm-1', is_member: true }, error: null });
      const mockExistEq2 = jest.fn().mockReturnValueOnce({ single: mockExistSingle });
      const mockExistEq1 = jest.fn().mockReturnValueOnce({ eq: mockExistEq2 });
      const mockExistSelect = jest.fn().mockReturnValueOnce({ eq: mockExistEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockExistSelect });

      const res = await POST(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toBe('Already a member of this server');
    });

    it('returns 409 if join request already pending', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      // Existing permission: is_member = false (pending)
      const mockExistSingle = jest.fn().mockResolvedValueOnce({ data: { id: 'perm-1', is_member: false }, error: null });
      const mockExistEq2 = jest.fn().mockReturnValueOnce({ single: mockExistSingle });
      const mockExistEq1 = jest.fn().mockReturnValueOnce({ eq: mockExistEq2 });
      const mockExistSelect = jest.fn().mockReturnValueOnce({ eq: mockExistEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockExistSelect });

      const res = await POST(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toBe('Join request already pending');
    });

    it('returns 200 and creates join request', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Server exists
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      // No existing permission
      const mockExistSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockExistEq2 = jest.fn().mockReturnValueOnce({ single: mockExistSingle });
      const mockExistEq1 = jest.fn().mockReturnValueOnce({ eq: mockExistEq2 });
      const mockExistSelect = jest.fn().mockReturnValueOnce({ eq: mockExistEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockExistSelect });

      // Insert join request: .from("server_permissions").insert({...}).select().single()
      const mockPermission = { id: 'perm-new', server_id: SERVER_ID, user_id: MOCK_USER.id, is_member: false };
      const mockInsertSingle = jest.fn().mockResolvedValueOnce({ data: mockPermission, error: null });
      const mockInsertSelect = jest.fn().mockReturnValueOnce({ single: mockInsertSingle });
      const mockInsert = jest.fn().mockReturnValueOnce({ select: mockInsertSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockInsert });

      const res = await POST(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.permission).toEqual(mockPermission);
    });

    it('returns 500 if insert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: { id: SERVER_ID }, error: null });
      const mockServerEq2 = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerEq1 = jest.fn().mockReturnValueOnce({ eq: mockServerEq2 });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ eq: mockServerEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockServerSelect });

      const mockExistSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockExistEq2 = jest.fn().mockReturnValueOnce({ single: mockExistSingle });
      const mockExistEq1 = jest.fn().mockReturnValueOnce({ eq: mockExistEq2 });
      const mockExistSelect = jest.fn().mockReturnValueOnce({ eq: mockExistEq1 });
      mockSupabase.from.mockReturnValueOnce({ select: mockExistSelect });

      const mockInsertSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockInsertSelect = jest.fn().mockReturnValueOnce({ single: mockInsertSingle });
      const mockInsert = jest.fn().mockReturnValueOnce({ select: mockInsertSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockInsert });

      const res = await POST(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
