import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { signIn } from '@/app/lib/auth';
import { createServerSideClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createServerSideClient: jest.fn().mockResolvedValue({
    auth: {},
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: { username: 'testuser' }, error: null })
        })
      })
    }),
  }),
}));

jest.mock('@/app/lib/auth', () => ({
  signIn: jest.fn(),
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

describe('/api/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const response = await OPTIONS(request);
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should return 403 if origin is not allowed', async () => {
      const { isOriginAllowed } = require('@/app/lib/serverFunctions');
      isOriginAllowed.mockReturnValueOnce(false);

      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://evil-site.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Origin not allowed');
    });

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 401 if credentials are invalid', async () => {
      signIn.mockResolvedValueOnce({
        session: null,
        error: { message: 'Invalid credentials' },
      });

      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should return 200 with session and profile if signin is successful', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: '123', email: 'test@example.com' },
      };
      const mockProfile = { username: 'Miner49er', interests: ['redstone'] };

      signIn.mockResolvedValueOnce({
        session: mockSession,
        error: null,
      });

      const supabase = await createServerSideClient();
      supabase.from().select().eq().maybeSingle.mockResolvedValueOnce({ 
        data: mockProfile, 
        error: null 
      });

      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'correct-password',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toEqual(mockSession);
      expect(data.profile).toEqual(mockProfile);
      
      expect(signIn).toHaveBeenCalledWith(
        expect.anything(), 
        'test@example.com', 
        'correct-password'
      );
    });

    it('should return 500 if an unexpected error occurs', async () => {
      signIn.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});