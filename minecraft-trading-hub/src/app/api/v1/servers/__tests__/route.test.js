import { NextRequest } from 'next/server';
import { GET, POST, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const BASE_URL = 'http://localhost:3000/api/v1/servers';
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };

const MOCK_SERVERS = [
  { id: 'srv-1', display_name: 'Test Server', mc_version: '1.20', owner_id: 'other-user' },
];

describe('/api/v1/servers', () => {
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

    // Servers query without search: .from().select().eq().order().limit()
    function mockServersQuery({ data = MOCK_SERVERS, error = null } = {}) {
      const mockLimit = jest.fn().mockResolvedValueOnce({ data, error });
      const mockOrder = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValueOnce({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      return { mockSelect, mockLimit };
    }

    // Servers query with search: .from().select().eq().order().limit().ilike()
    function mockServersQueryWithSearch({ data = MOCK_SERVERS, error = null } = {}) {
      const mockIlike = jest.fn().mockResolvedValueOnce({ data, error });
      const mockLimit = jest.fn().mockReturnValueOnce({ ilike: mockIlike });
      const mockOrder = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValueOnce({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      return { mockSelect };
    }

    // Permissions query: .from("server_permissions").select().eq("user_id",...).in("server_id",...)
    function mockPermsQuery({ data = [] } = {}) {
      const mockIn = jest.fn().mockResolvedValueOnce({ data, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ in: mockIn });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      return { mockSelect };
    }

    it('returns 401 if no authorization header', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { Origin: 'http://localhost:3000' } });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if auth header missing Bearer prefix', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { Origin: 'http://localhost:3000', Authorization: 'invalid' } });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it('returns 400 if limit is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const res = await GET(makeGetRequest(`${BASE_URL}?limit=abc`));
      expect(res.status).toBe(400);
    });

    it('returns 400 if limit is less than 1', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const res = await GET(makeGetRequest(`${BASE_URL}?limit=0`));
      expect(res.status).toBe(400);
    });

    it('returns 200 with servers list', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: serversSelect } = mockServersQuery();
      mockSupabase.from.mockReturnValueOnce({ select: serversSelect });

      const { mockSelect: permsSelect } = mockPermsQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permsSelect });

      const res = await GET(makeGetRequest());
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data.servers)).toBe(true);
    });

    it('returns 200 with empty array when no servers', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: serversSelect } = mockServersQuery({ data: [] });
      mockSupabase.from.mockReturnValueOnce({ select: serversSelect });

      // No server IDs so no permissions query is made
      const res = await GET(makeGetRequest());
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.servers).toEqual([]);
    });

    it('returns 200 with search filter', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: serversSelect } = mockServersQueryWithSearch();
      mockSupabase.from.mockReturnValueOnce({ select: serversSelect });

      const { mockSelect: permsSelect } = mockPermsQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permsSelect });

      const res = await GET(makeGetRequest(`${BASE_URL}?search=Test`));
      expect(res.status).toBe(200);
    });

    it('returns 500 if servers query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: serversSelect } = mockServersQuery({ data: null, error: { message: 'DB error' } });
      mockSupabase.from.mockReturnValueOnce({ select: serversSelect });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(500);
    });

    it('marks server as user permission when user is owner', async () => {
      const ownerUser = { id: 'owner-123', email: 'owner@example.com' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: ownerUser }, error: null });

      const ownedServer = { id: 'srv-1', display_name: 'My Server', owner_id: ownerUser.id };
      const { mockSelect: serversSelect } = mockServersQuery({ data: [ownedServer] });
      mockSupabase.from.mockReturnValueOnce({ select: serversSelect });

      const { mockSelect: permsSelect } = mockPermsQuery({ data: [] });
      mockSupabase.from.mockReturnValueOnce({ select: permsSelect });

      const res = await GET(makeGetRequest());
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.servers[0].userPermission).toEqual({ is_member: true, is_admin: true });
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
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await POST(makePostRequest({ display_name: 'Server' }));
      expect(res.status).toBe(401);
    });

    it('returns 400 if display_name is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const res = await POST(makePostRequest({}));
      expect(res.status).toBe(400);
    });

    it('returns 400 if display_name is only whitespace', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const res = await POST(makePostRequest({ display_name: '   ' }));
      expect(res.status).toBe(400);
    });

    it('returns 201 and creates server with permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      // Server insert: .from("servers").insert({...}).select(...).single()
      const newServer = { id: 'srv-new', display_name: 'My Server', mc_version: '1.20', owner_id: MOCK_USER.id };
      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: newServer, error: null });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerInsert = jest.fn().mockReturnValueOnce({ select: mockServerSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockServerInsert });

      // Permissions insert: .from("server_permissions").insert({...})
      const mockPermInsert = jest.fn().mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValueOnce({ insert: mockPermInsert });

      const res = await POST(makePostRequest({ display_name: 'My Server', mc_version: '1.20' }));
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.server).toEqual(newServer);
    });

    it('returns 500 if server insert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockServerSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockServerSelect = jest.fn().mockReturnValueOnce({ single: mockServerSingle });
      const mockServerInsert = jest.fn().mockReturnValueOnce({ select: mockServerSelect });
      mockSupabase.from.mockReturnValueOnce({ insert: mockServerInsert });

      const res = await POST(makePostRequest({ display_name: 'My Server' }));
      expect(res.status).toBe(500);
    });
  });
});
