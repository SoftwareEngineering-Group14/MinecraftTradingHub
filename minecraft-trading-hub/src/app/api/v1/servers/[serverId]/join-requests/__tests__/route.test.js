import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const BASE_URL = `http://localhost:3000/api/v1/servers/${SERVER_ID}/join-requests`;
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID });

function makeRequest() {
  return new NextRequest(BASE_URL, { method: 'GET', headers: DEFAULT_HEADERS });
}

// Mock: .from("server_permissions").select("is_admin").eq("server_id",...).eq("user_id",...).single()
function mockCallerPerm({ is_admin = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: is_admin !== null ? { is_admin } : null, error: null });
  const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEqServer = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServer });
  return { mockSelect };
}

// Mock: .from("profiles").select("is_developer").eq("id", user.id).single()
function mockProfileQuery({ is_developer = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

// Mock: .from("server_permissions").select(...).eq("server_id",...).eq("is_member", false)
function mockJoinRequestsQuery({ data = [], error = null } = {}) {
  const mockEqMember = jest.fn().mockResolvedValueOnce({ data, error });
  const mockEqServer = jest.fn().mockReturnValueOnce({ eq: mockEqMember });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServer });
  return { mockSelect };
}

describe('/api/v1/servers/[serverId]/join-requests', () => {
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
    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { Origin: 'http://localhost:3000' } });
      const res = await GET(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if auth header missing Bearer prefix', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { ...DEFAULT_HEADERS, Authorization: 'invalid' } });
      const res = await GET(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await GET(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is neither server admin nor platform admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const res = await GET(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 200 as server admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const mockRequests = [{ id: 'req-1', user_id: 'u1', is_member: false }];
      const { mockSelect: requestsSelect } = mockJoinRequestsQuery({ data: mockRequests });
      mockSupabase.from.mockReturnValueOnce({ select: requestsSelect });

      const res = await GET(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.requests).toEqual(mockRequests);
    });

    it('returns 200 as platform admin even without server admin role', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: true });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: requestsSelect } = mockJoinRequestsQuery({ data: [] });
      mockSupabase.from.mockReturnValueOnce({ select: requestsSelect });

      const res = await GET(makeRequest(), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.requests).toEqual([]);
    });

    it('returns 500 if query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: requestsSelect } = mockJoinRequestsQuery({ data: null, error: { message: 'DB error' } });
      mockSupabase.from.mockReturnValueOnce({ select: requestsSelect });

      const res = await GET(makeRequest(), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
