import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { signIn } from '@/app/lib/auth';

// Mock the auth module
jest.mock('@/app/lib/auth', () => ({
  signIn: jest.fn(),
}));

// Mock serverFunctions
jest.mock('@/app/lib/serverFunctions', () => ({
  isOriginAllowed: jest.fn((origin, allowedOrigins) =>
    allowedOrigins.includes(origin)
  ),
}));

// Mock next/headers cookies — the route calls cookies() then .set() on the result
const mockCookieSet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('/api/v1/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({ set: mockCookieSet });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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
      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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

    it('should return 400 if password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
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

      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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

    it('should return 200, return the session, and set mth_session cookie on success', async () => {
      const mockSession = {
        session: { access_token: 'mock-access-token' },
        user: { id: '123', email: 'test@example.com' },
      };

      signIn.mockResolvedValueOnce({
        session: mockSession,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'correct-password');

      // Verify the persistent session cookie was set with the correct options
      expect(mockCookieSet).toHaveBeenCalledWith(
        'mth_session',
        'mock-access-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // COOKIE_MAX_AGE_30_DAYS
          path: '/',
        })
      );
    });

    it('should not set cookie if sign in fails', async () => {
      signIn.mockResolvedValueOnce({
        session: null,
        error: { message: 'Invalid credentials' },
      });

      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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

      await POST(request);

      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('should return 500 if an unexpected error occurs', async () => {
      signIn.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/signin', {
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
