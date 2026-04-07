import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const BASE_URL = 'http://localhost:3000/api/v1/admin/users';
const MOCK_USER = { id: 'admin-user-1', email: 'admin@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };

function makeRequest(url = BASE_URL) {
  return new NextRequest(url, { method: 'GET', headers: DEFAULT_HEADERS });
}

function mockDeveloperProfile({ is_developer = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

describe('/api/v1/admin/users', () => {
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
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if auth header missing Bearer prefix', async () => {
      const req = new NextRequest(BASE_URL, { method: 'GET', headers: { Origin: 'http://localhost:3000', Authorization: 'invalid-token' } });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a developer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=test`));
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 403 if profile is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const mockSingle = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=test`));
      expect(res.status).toBe(403);
    });

    it('returns 400 if search query is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeRequest());
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Search query is required');
    });

    it('returns 400 if search is only whitespace', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=   `));
      expect(res.status).toBe(400);
    });

    it('returns 200 with matching users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      // Users query: .from("profiles").select(...).ilike(...).neq(...).limit(20)
      const mockUsers = [{ id: 'u1', username: 'testuser', name: 'Test User', is_banned: false }];
      const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockUsers, error: null });
      const mockNeq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockIlike = jest.fn().mockReturnValueOnce({ neq: mockNeq });
      const mockUsersSelect = jest.fn().mockReturnValueOnce({ ilike: mockIlike });
      mockSupabase.from.mockReturnValueOnce({ select: mockUsersSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=test`));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.users).toEqual(mockUsers);
    });

    it('returns 200 with empty array when no users match', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const mockLimit = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockNeq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockIlike = jest.fn().mockReturnValueOnce({ neq: mockNeq });
      const mockUsersSelect = jest.fn().mockReturnValueOnce({ ilike: mockIlike });
      mockSupabase.from.mockReturnValueOnce({ select: mockUsersSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=nobody`));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it('returns 500 if users query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const mockLimit = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockNeq = jest.fn().mockReturnValueOnce({ limit: mockLimit });
      const mockIlike = jest.fn().mockReturnValueOnce({ neq: mockNeq });
      const mockUsersSelect = jest.fn().mockReturnValueOnce({ ilike: mockIlike });
      mockSupabase.from.mockReturnValueOnce({ select: mockUsersSelect });

      const res = await GET(makeRequest(`${BASE_URL}?search=test`));
      expect(res.status).toBe(500);
    });
  });
});
