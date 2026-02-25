import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';

jest.mock('@/app/lib/serverFunctions', () => ({
  isOriginAllowed: jest.fn((origin, allowedOrigins) =>
    allowedOrigins.includes(origin)
  ),
  corsHeaders: jest.fn(() => ({})),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('@/app/lib/supabaseClient', () => ({
  createServerSideClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

const makeRequest = (body, origin = 'http://localhost:3000') =>
  new NextRequest('http://localhost:3000/api/onboarding/username', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const mockUser = { id: 'user-123' };

describe('/api/onboarding/username', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.updateUser.mockResolvedValue({});
  });

  describe('OPTIONS', () => {
    it('should return 200 for preflight request', async () => {
      const request = new NextRequest('http://localhost:3000/api/onboarding/username', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });
      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should return 403 if origin is not allowed', async () => {
      const { isOriginAllowed } = require('@/app/lib/serverFunctions');
      isOriginAllowed.mockReturnValueOnce(false);

      const response = await POST(makeRequest({ username: 'testuser' }, 'http://evil.com'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Origin not allowed');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const response = await POST(makeRequest({ username: 'testuser' }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if username is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if username is shorter than 3 characters', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({ username: 'ab' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 409 if username is already taken', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: { id: 'other-user' }, error: null }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      const response = await POST(makeRequest({ username: 'takenuser' }));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Username already taken');
    });

    it('should return 400 if the profile update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      };
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } }),
      };
      mockSupabase.from
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const response = await POST(makeRequest({ username: 'newuser' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('DB error');
    });

    it('should return 200 and update user_metadata on success', async () => {
      const mockProfile = { id: 'user-123', username: 'newuser' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      };
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      };
      mockSupabase.from
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const response = await POST(makeRequest({ username: 'newuser' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toEqual(mockProfile);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { username: 'newuser' } });
    });

    it('should return 500 if an unexpected error occurs', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected failure'));

      const response = await POST(makeRequest({ username: 'newuser' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
