import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
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
const BASE_URL = `http://localhost:3000/api/v1/${SERVER_ID}/listings`;
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token' };
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const MOCK_LISTINGS = [
  { id: 'listing-1', store_id: 'store-1', name: 'Diamond Sword', quantity: 1, category: 'weapon', price: 100 },
  { id: 'listing-2', store_id: 'store-1', name: 'Golden Apple', quantity: 5, category: 'food', price: 20 },
];

// Builds the full supabase chain mock for the listings query
// Each chainable method returns the same chain object, supporting any filter combination
function mockListingsQuery({ data = MOCK_LISTINGS, error = null } = {}) {
  const mockLimit = jest.fn().mockResolvedValueOnce({ data, error });
  const queryChain = {
    eq: jest.fn(),
    ilike: jest.fn(),
    limit: mockLimit,
  };
  queryChain.eq.mockReturnValue(queryChain);
  queryChain.ilike.mockReturnValue(queryChain);
  const mockSelect = jest.fn().mockReturnValueOnce(queryChain);
  return { mockSelect, queryChain, mockLimit };
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

function makeRequest(url = BASE_URL, headers = DEFAULT_HEADERS, body = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ serverId: SERVER_ID });

describe(`/api/v1/[serverId]/listings`, () => {
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
    it('should return 401 if no authorization header is provided', async () => {
      const request = makeRequest(BASE_URL, { Origin: 'http://localhost:3000' });
      const response = await POST(request, { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if authorization header is missing Bearer prefix', async () => {
      const request = makeRequest(BASE_URL, { ...DEFAULT_HEADERS, Authorization: 'valid-token' });
      const response = await POST(request, { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user has no permissions record for the server', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: null });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('should return 403 if user has can_read set to false', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User does not have correct permissions');
    });

    it('should return listings for a server the user can read', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery({ can_read: true });
      const { mockSelect: listingsSelect, mockLimit } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toEqual(MOCK_LISTINGS);
      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('should use default limit of 25 when no limit param is provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, mockLimit } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      await POST(makeRequest(), { params: PARAMS });

      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('should use custom limit when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, mockLimit } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      await POST(makeRequest(`${BASE_URL}?limit=50`), { params: PARAMS });

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should return 400 if limit is not a valid integer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await POST(makeRequest(`${BASE_URL}?limit=abc`), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should return 400 if limit is less than 1', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await POST(makeRequest(`${BASE_URL}?limit=0`), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should return 400 if listingCategory is not a valid enum value', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const response = await POST(makeRequest(BASE_URL, DEFAULT_HEADERS, { listingCategory: 'invalid' }), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid category. Must be one of: food, weapon, tool, armor, potion, enchantments, misc');
    });

    it('should filter by storeId when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, queryChain } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(BASE_URL, DEFAULT_HEADERS, { storeId: 1 }), { params: PARAMS });

      expect(response.status).toBe(200);
      expect(queryChain.eq).toHaveBeenCalledWith('store_id', 1);
    });

    it('should filter by listingName with case-insensitive partial match when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, queryChain } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(BASE_URL, DEFAULT_HEADERS, { listingName: 'sword' }), { params: PARAMS });

      expect(response.status).toBe(200);
      expect(queryChain.ilike).toHaveBeenCalledWith('name', '%sword%');
    });

    it('should filter by listingQuantity with exact match when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, queryChain } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(BASE_URL, DEFAULT_HEADERS, { listingQuantity: 5 }), { params: PARAMS });

      expect(response.status).toBe(200);
      expect(queryChain.eq).toHaveBeenCalledWith('quantity', 5);
    });

    it('should filter by listingCategory when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect, queryChain } = mockListingsQuery();

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(BASE_URL, DEFAULT_HEADERS, { listingCategory: 'weapon' }), { params: PARAMS });

      expect(response.status).toBe(200);
      expect(queryChain.eq).toHaveBeenCalledWith('category', 'weapon');
    });

    it('should return 500 if the database query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect } = mockListingsQuery({ data: null, error: { message: 'DB error' } });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return an empty array if no listings exist on the server', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockPermissionQuery();
      const { mockSelect: listingsSelect } = mockListingsQuery({ data: [] });

      mockSupabase.from
        .mockReturnValueOnce({ select: permSelect })
        .mockReturnValueOnce({ select: listingsSelect });

      const response = await POST(makeRequest(), { params: PARAMS });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toEqual([]);
    });
  });
});
