import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { signUp } from '@/app/lib/auth';

// Mock the auth module
jest.mock('@/app/lib/auth', () => ({
  signUp: jest.fn(),
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

describe('/api/v1/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { cookies } = require('next/headers');
    cookies.mockResolvedValue({ set: mockCookieSet });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
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

      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://evil-site.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Origin not allowed');
    });

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
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

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if signup fails with error', async () => {
      signUp.mockResolvedValueOnce({
        user: null,
        profile: null,
        error: { message: 'Email already exists' },
      });

      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email already exists');
    });

    it('should return 201, return user and profile, and set mth_session cookie when user has a session', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        session: { access_token: 'mock-access-token' },
      };
      const mockProfile = {
        id: '123',
        name: 'Test User',
      };

      signUp.mockResolvedValueOnce({
        user: mockUser,
        profile: mockProfile,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toEqual(mockUser);
      expect(data.profile).toEqual(mockProfile);
      expect(signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');

      // Verify the session cookie was set with the correct options
      expect(mockCookieSet).toHaveBeenCalledWith(
        'mth_session',
        'mock-access-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // COOKIE_MAX_AGE_7_DAYS
          path: '/',
        })
      );
    });

    it('should return 201 without setting cookie when user has no session (email confirmation required)', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        // no session — Supabase requires email confirmation
      };
      const mockProfile = {
        id: '123',
        name: 'Test User',
      };

      signUp.mockResolvedValueOnce({
        user: mockUser,
        profile: mockProfile,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('should return 500 if an unexpected error occurs', async () => {
      signUp.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle empty string values as missing fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: '',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });
});
