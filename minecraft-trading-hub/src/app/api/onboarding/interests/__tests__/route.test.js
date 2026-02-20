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
  new NextRequest('http://localhost:3000/api/onboarding/interests', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const mockUser = { id: 'user-123' };

describe('/api/onboarding/interests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.updateUser.mockResolvedValue({});
  });

  describe('OPTIONS', () => {
    it('should return 200 for preflight request', async () => {
      const request = new NextRequest('http://localhost:3000/api/onboarding/interests', {
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

      const response = await POST(makeRequest({ interests: ['Trading'] }, 'http://evil.com'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Origin not allowed');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const response = await POST(makeRequest({ interests: ['Trading'] }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if interests is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if interests is not an array', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({ interests: 'Trading' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if interests is an empty array', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({ interests: [] }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if no interests are valid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const response = await POST(makeRequest({ interests: ['InvalidInterest', 'FakeTag'] }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid interests provided');
    });

    it('should filter out invalid interests and save only valid ones', async () => {
      const mockProfile = { id: 'user-123', interests: ['Trading', 'PvP'] };
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUpdateQuery);

      const response = await POST(makeRequest({ interests: ['Trading', 'PvP', 'InvalidTag'] }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ interests: ['Trading', 'PvP'] });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { interests: ['Trading', 'PvP'] } });
      expect(data.profile).toEqual(mockProfile);
    });

    it('should return 400 if the profile update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUpdateQuery);

      const response = await POST(makeRequest({ interests: ['Trading'] }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('DB error');
    });

    it('should return 200 and update user_metadata on success', async () => {
      const mockProfile = { id: 'user-123', interests: ['Trading', 'Redstone'] };
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUpdateQuery);

      const response = await POST(makeRequest({ interests: ['Trading', 'Redstone'] }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toEqual(mockProfile);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { interests: ['Trading', 'Redstone'] } });
    });

    it('should return 500 if an unexpected error occurs', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected failure'));

      const response = await POST(makeRequest({ interests: ['Trading'] }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
