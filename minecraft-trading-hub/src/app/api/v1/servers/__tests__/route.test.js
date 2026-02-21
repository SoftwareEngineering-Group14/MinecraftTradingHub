import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../route';
import { createServerSideClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createServerSideClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  isOriginAllowed: jest.fn((origin, allowedOrigins) =>
    allowedOrigins.includes(origin)
  ),
  corsHeaders: jest.fn((origin, allowedOrigins, methods, headers) => ({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
  })),
}));

const BASE_URL = 'http://localhost:3000/api/v1/servers';
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const MOCK_PERMISSIONS = [
  { entity_id: 'server-1' },
  { entity_id: 'server-2' },
];
const MOCK_SERVERS = [
  { id: 'server-1', display_name: 'Server 1', owner_id: 'owner-1', mc_version: '1.20.1' },
  { id: 'server-2', display_name: 'Server 2', owner_id: 'owner-2', mc_version: '1.19.4' },
];

// Builds the permissions query mock
function mockPermissionsQuery({ data = MOCK_PERMISSIONS, error = null } = {}) {
  const mockEq = jest.fn().mockResolvedValueOnce({ data, error });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect, mockEq };
}

// Builds the servers query mock
function mockServersQuery({ data = MOCK_SERVERS, error = null } = {}) {
  const mockLimit = jest.fn().mockResolvedValueOnce({ data, error });
  const mockIn = jest.fn().mockReturnValueOnce({ limit: mockLimit });
  const mockSelect = jest.fn().mockReturnValueOnce({ in: mockIn });
  return { mockSelect, mockIn, mockLimit };
}

function makeRequest(url = BASE_URL, headers = DEFAULT_HEADERS) {
  return new NextRequest(url, { method: 'GET', headers });
}

describe('/api/v1/servers', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    createServerSideClient.mockResolvedValue(mockSupabase);
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = new NextRequest(BASE_URL, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } });
      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });
  });

  describe('GET', () => {
    it('should return 401 if no authorization header is provided', async () => {
      const request = makeRequest(BASE_URL, { Origin: 'http://localhost:3000' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if authorization header is missing Bearer prefix', async () => {
      const request = makeRequest(BASE_URL, { ...DEFAULT_HEADERS, Authorization: 'valid-token' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all servers the user has permissions for', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect, mockEq } = mockPermissionsQuery();
      const { mockSelect: serversSelect, mockIn, mockLimit } = mockServersQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: serversSelect });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.servers).toEqual(MOCK_SERVERS);
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockIn).toHaveBeenCalledWith('id', ['server-1', 'server-2']);
      expect(serversSelect).toHaveBeenCalledWith('id, display_name, owner_id, mc_version');
    });

    it('should return empty array if user has no permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: [] });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.servers).toEqual([]);
    });

    it('should use default limit of 10 when no limit param is provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: [{ entity_id: 'server-1' }] });
      const { mockSelect: serversSelect, mockLimit } = mockServersQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: serversSelect });

      await GET(makeRequest());

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: [{ entity_id: 'server-1' }] });
      const { mockSelect: serversSelect, mockLimit } = mockServersQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: serversSelect });

      await GET(makeRequest(`${BASE_URL}?limit=5`));

      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should return 400 if limit is not a valid integer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const response = await GET(makeRequest(`${BASE_URL}?limit=abc`));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should cap limit at 100 even if higher value is requested', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: [{ entity_id: 'server-1' }] });
      const { mockSelect: serversSelect, mockLimit } = mockServersQuery({ data: [] });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: serversSelect });

      const response = await GET(makeRequest(`${BASE_URL}?limit=500`));

      expect(response.status).toBe(200);
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should return 500 if permissions query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: null, error: { message: 'Database error' } });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 if servers query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionsQuery({ data: [{ entity_id: 'server-1' }] });
      const { mockSelect: serversSelect } = mockServersQuery({ data: null, error: { message: 'Database error' } });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: serversSelect });

      const response = await GET(makeRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
