import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../route';
import { createServerSideClient } from '@/app/lib/supabaseClient';

// Mock the supabaseClient
jest.mock('@/app/lib/supabaseClient', () => ({
  createServerSideClient: jest.fn(),
}));

// Mock serverFunctions
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

describe('/api/v1/store', () => {
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
      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });
  });

  describe('GET', () => {
    it('should return 401 if no authorization header is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if Bearer is not in authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return only stores owned by the authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockStores = [
        { id: 'store-1', owner_id: 'user-123', description: 'My Store 1' },
        { id: 'store-2', owner_id: 'user-123', description: 'My Store 2' },
      ];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: mockStores,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValueOnce({
        limit: mockLimit,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: mockEq,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stores).toEqual(mockStores);
      expect(mockEq).toHaveBeenCalledWith('owner_id', 'user-123');
      // Verify all stores have the correct owner_id
      data.stores.forEach(store => {
        expect(store.owner_id).toBe('user-123');
      });
    });

    it('should return stores with default limit of 10', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockStores = [
        { id: 1, name: 'Store 1' },
        { id: 2, name: 'Store 2' },
      ];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: mockStores,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValueOnce({
        limit: mockLimit,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: mockEq,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stores).toEqual(mockStores);
      expect(mockEq).toHaveBeenCalledWith('owner_id', '123');
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should return stores with custom limit from query parameter', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockStores = [
        { id: 1, name: 'Store 1' },
        { id: 2, name: 'Store 2' },
        { id: 3, name: 'Store 3' },
      ];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: mockStores,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValueOnce({
        limit: mockLimit,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: mockEq,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store?limit=5', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stores).toEqual(mockStores);
      expect(mockEq).toHaveBeenCalledWith('owner_id', '123');
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should return 400 if limit parameter is invalid', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store?limit=abc', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid limit parameter. Must be a positive integer.');
    });

    it('should cap limit at 100 even if higher value is requested', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockStores = [];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: mockStores,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValueOnce({
        limit: mockLimit,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: mockEq,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store?limit=500', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('owner_id', '123');
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should return 500 if database query fails', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            limit: jest.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/store', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
