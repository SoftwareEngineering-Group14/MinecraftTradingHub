import { NextRequest } from 'next/server';
import { PATCH, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const TARGET_USER_ID = 'target-user-1';
const BASE_URL = `http://localhost:3000/api/v1/admin/users/${TARGET_USER_ID}`;
const MOCK_USER = { id: 'admin-user-1', email: 'admin@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };
const PARAMS = Promise.resolve({ userId: TARGET_USER_ID });

function makeRequest(body = {}, headers = DEFAULT_HEADERS) {
  return new NextRequest(BASE_URL, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

function mockDeveloperProfile({ is_developer = true } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

function mockTargetUser({ data = { id: TARGET_USER_ID } } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

describe('/api/v1/admin/users/[userId]', () => {
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

  describe('PATCH', () => {
    it('returns 401 if no authorization header', async () => {
      const res = await PATCH(makeRequest({}, { Origin: 'http://localhost:3000' }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is not a developer', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 400 if user tries to ban themselves', async () => {
      const selfUser = { id: TARGET_USER_ID, email: 'self@example.com' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: selfUser }, error: null });
      const { mockSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Cannot ban yourself');
    });

    it('returns 400 if is_banned is not a boolean', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await PATCH(makeRequest({ is_banned: 'yes' }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('is_banned must be a boolean');
    });

    it('returns 400 if is_banned is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });
      const { mockSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: mockSelect });

      const res = await PATCH(makeRequest({}), { params: PARAMS });
      expect(res.status).toBe(400);
    });

    it('returns 404 if target user not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: targetSelect } = mockTargetUser({ data: null });
      mockSupabase.from.mockReturnValueOnce({ select: targetSelect });

      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 and bans user successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: targetSelect } = mockTargetUser();
      mockSupabase.from.mockReturnValueOnce({ select: targetSelect });

      // Update: .from("profiles").update({is_banned}).eq("id", userId).select(...).single()
      const updatedUser = { id: TARGET_USER_ID, username: 'targetuser', is_banned: true };
      const mockUpdateSingle = jest.fn().mockResolvedValueOnce({ data: updatedUser, error: null });
      const mockUpdateSelect = jest.fn().mockReturnValueOnce({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValueOnce({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockUpdateEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.user).toEqual(updatedUser);
    });

    it('returns 200 and unbans user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: targetSelect } = mockTargetUser();
      mockSupabase.from.mockReturnValueOnce({ select: targetSelect });

      const updatedUser = { id: TARGET_USER_ID, username: 'targetuser', is_banned: false };
      const mockUpdateSingle = jest.fn().mockResolvedValueOnce({ data: updatedUser, error: null });
      const mockUpdateSelect = jest.fn().mockReturnValueOnce({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValueOnce({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockUpdateEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await PATCH(makeRequest({ is_banned: false }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.user.is_banned).toBe(false);
    });

    it('returns 500 if update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: profileSelect } = mockDeveloperProfile();
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: targetSelect } = mockTargetUser();
      mockSupabase.from.mockReturnValueOnce({ select: targetSelect });

      const mockUpdateSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockUpdateSelect = jest.fn().mockReturnValueOnce({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValueOnce({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockUpdateEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await PATCH(makeRequest({ is_banned: true }), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
