import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { createServerSideClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createServerSideClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  isOriginAllowed: jest.fn((origin, allowedOrigins) => allowedOrigins.includes(origin)),
  corsHeaders: jest.fn((origin, allowedOrigins, methods, headers) => ({
    'Access-Control-Allow-Origin': origin,
  })),
}));

describe('/api/onboarding/interests', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    
    createServerSideClient.mockResolvedValue(mockSupabase);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const request = new NextRequest('http://localhost:3000/api/onboarding/interests', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
      body: JSON.stringify({ interests: ['PvP', 'Redstone'] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 400 if interests is not an array', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ 
        data: { session: { user: { id: '123' } } } 
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/interests', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
      body: JSON.stringify({ interests: 'Not an array' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 200 if update is successful', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ 
        data: { session: { user: { id: '123' } } } 
    });
    mockSupabase.eq.mockResolvedValueOnce({ error: null });

    const request = new NextRequest('http://localhost:3000/api/onboarding/interests', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
      body: JSON.stringify({ interests: ['Building', 'Trading'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Interests updated successfully');
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});