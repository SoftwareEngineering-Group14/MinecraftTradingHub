import { NextRequest } from 'next/server';
import { GET, POST, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin, allowedOrigins, methods, headers) => ({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
  })),
}));

const SERVER_ID = 'server-123';
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/stores`;
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const MOCK_STORES = [
  { id: 'store-1', server_name: 'Test Server', description: 'First store' },
  { id: 'store-2', server_name: 'Test Server', description: 'Second store' },
];

// Builds the full supabase chain mock for the user_stores query
function mockStoresQuery({ data = MOCK_STORES, error = null } = {}) {
  const mockLimit = jest.fn().mockResolvedValueOnce({ data, error });
  const mockEqStatus = jest.fn().mockReturnValueOnce({ limit: mockLimit });
  const mockEqServerId = jest.fn().mockReturnValueOnce({ eq: mockEqStatus });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServerId });
  return { mockLimit, mockSelect };
}

// Builds the permissions query mock
function mockPermissionQuery({ can_read = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({
    data: can_read !== null ? { can_read } : null,
    error: null,
  });
  const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEqEntity = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqEntity });
  return { mockSelect };
}

function makeRequest(url = BASE_URL, headers = DEFAULT_HEADERS) {
  return new NextRequest(url, { method: 'GET', headers });
}

const PARAMS = Promise.resolve({ serverId: SERVER_ID });

describe(`/api/v1/[serverId]/stores`, () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    createAuthenticatedClient.mockReturnValue(mockSupabase);
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = new NextRequest(BASE_URL, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } });
      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    function makePostRequest(url = BASE_URL, body = {}, headers = DEFAULT_HEADERS) {
      return new NextRequest(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    function mockPermissionForPost({ can_read = true } = {}) {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: can_read !== null ? { can_read } : null,
        error: null,
      });
      const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockEqEntity = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqEntity });
      return { mockSelect };
    }

    function mockServerQuery({ data = { display_name: 'Test Server' }, error = null } = {}) {
      const mockSingle = jest.fn().mockResolvedValueOnce({ data, error });
      const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      return { mockSelect };
    }

    function mockInsertStore({ data = { id: 'store-new', name: 'My Store' }, error = null } = {}) {
      const mockSingle = jest.fn().mockResolvedValueOnce({ data, error });
      const mockSelect = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValueOnce({ select: mockSelect });
      return { mockInsert };
    }

    it('should return 401 if no authorization header', async () => {
      const req = makePostRequest(BASE_URL, { name: 'My Store' }, { Origin: 'http://localhost:3000' });
      const response = await POST(req, { params: PARAMS });
      expect(response.status).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const response = await POST(makePostRequest(BASE_URL, { name: 'My Store' }), { params: PARAMS });
      expect(response.status).toBe(401);
    });

    it('should return 403 if user lacks read permission', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockPermissionForPost({ can_read: null });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const response = await POST(makePostRequest(BASE_URL, { name: 'My Store' }), { params: PARAMS });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('should return 400 if name is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockPermissionForPost();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const response = await POST(makePostRequest(BASE_URL, {}), { params: PARAMS });
      const data = await response.json();
      expect(response.status).toBe(400);
    });

    it('should return 400 if name is only whitespace', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockPermissionForPost();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const response = await POST(makePostRequest(BASE_URL, { name: '   ' }), { params: PARAMS });
      expect(response.status).toBe(400);
    });

    it('should return 404 if server not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect: permSelect } = mockPermissionForPost();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: serverSelect } = mockServerQuery({ data: null, error: { message: 'Not found' } });
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const response = await POST(makePostRequest(BASE_URL, { name: 'My Store' }), { params: PARAMS });
      expect(response.status).toBe(404);
    });

    it('should return 201 and create store successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionForPost();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: serverSelect } = mockServerQuery();
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const newStore = { id: 'store-new', name: 'My Store', server_name: 'Test Server' };
      const { mockInsert } = mockInsertStore({ data: newStore });
      mockSupabase.from.mockReturnValueOnce({ insert: mockInsert });

      const response = await POST(makePostRequest(BASE_URL, { name: 'My Store', description: 'A shop' }), { params: PARAMS });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.store).toEqual(newStore);
    });

    it('should return 500 if insert fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionForPost();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: serverSelect } = mockServerQuery();
      mockSupabase.from.mockReturnValueOnce({ select: serverSelect });

      const { mockInsert } = mockInsertStore({ data: null, error: { message: 'DB error' } });
      mockSupabase.from.mockReturnValueOnce({ insert: mockInsert });

      const response = await POST(makePostRequest(BASE_URL, { name: 'My Store' }), { params: PARAMS });
      expect(response.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('should return 401 if no authorization header is provided', async () => {
      const request = makeRequest(BASE_URL, { Origin: 'http://localhost:3000' });
      const response = await GET(request, { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if authorization header is missing Bearer prefix', async () => {
      const request = makeRequest(BASE_URL, { ...DEFAULT_HEADERS, Authorization: 'valid-token' });
      const response = await GET(request, { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user has no permissions record for the server', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: null });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('should return 403 if user has can_read set to false', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('should return active stores for a server the user can read', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: true });
      const { mockSelect: storesSelect, mockLimit } = mockStoresQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: storesSelect });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stores).toEqual(MOCK_STORES);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 10 when no limit param is provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: storesSelect, mockLimit } = mockStoresQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: storesSelect });

      await GET(makeRequest(), { params: PARAMS });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: storesSelect, mockLimit } = mockStoresQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: storesSelect });

      await GET(makeRequest(`${BASE_URL}?limit=25`), { params: PARAMS });

      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('should return 400 if limit is not a valid integer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest(`${BASE_URL}?limit=abc`), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should return 400 if limit is less than 1', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest(`${BASE_URL}?limit=0`), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should return 500 if the database query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: storesSelect } = mockStoresQuery({ data: null, error: { message: 'DB error' } });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: storesSelect });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return an empty array if no active stores exist on the server', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: storesSelect } = mockStoresQuery({ data: [] });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: storesSelect });

      const response = await GET(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stores).toEqual([]);
    });
  });
});
