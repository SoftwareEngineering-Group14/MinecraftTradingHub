import { NextRequest } from 'next/server';
import { PATCH, OPTIONS } from '../route';
import { createAuthenticatedClient } from '@/app/lib/supabaseClient';

jest.mock('@/app/lib/supabaseClient', () => ({
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('@/app/lib/serverFunctions', () => ({
  corsHeaders: jest.fn((origin) => ({ 'Access-Control-Allow-Origin': origin })),
}));

const SERVER_ID = 'server-123';
const REQUEST_ID = 'req-456';
const BASE_URL = `http://localhost:3000/api/v1/servers/${SERVER_ID}/join-requests/${REQUEST_ID}`;
const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
const DEFAULT_HEADERS = { Origin: 'http://localhost:3000', Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };
const PARAMS = Promise.resolve({ serverId: SERVER_ID, requestId: REQUEST_ID });

function makeRequest(body = {}) {
  return new NextRequest(BASE_URL, {
    method: 'PATCH',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });
}

function mockCallerPerm({ is_admin = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: is_admin !== null ? { is_admin } : null, error: null });
  const mockEqUser = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEqServer = jest.fn().mockReturnValueOnce({ eq: mockEqUser });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEqServer });
  return { mockSelect };
}

function mockProfileQuery({ is_developer = false } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data: { is_developer }, error: null });
  const mockEq = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq });
  return { mockSelect };
}

// Mock: existing join request lookup: .from("server_permissions").select(...).eq("id",...).eq("server_id",...).eq("is_member", false).single()
function mockExistingRequest({ data = { id: REQUEST_ID, is_member: false }, error = null } = {}) {
  const mockSingle = jest.fn().mockResolvedValueOnce({ data, error });
  const mockEq3 = jest.fn().mockReturnValueOnce({ single: mockSingle });
  const mockEq2 = jest.fn().mockReturnValueOnce({ eq: mockEq3 });
  const mockEq1 = jest.fn().mockReturnValueOnce({ eq: mockEq2 });
  const mockSelect = jest.fn().mockReturnValueOnce({ eq: mockEq1 });
  return { mockSelect };
}

describe('/api/v1/servers/[serverId]/join-requests/[requestId]', () => {
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
      const req = new NextRequest(BASE_URL, { method: 'PATCH', headers: { Origin: 'http://localhost:3000' } });
      const res = await PATCH(req, { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid' } });
      const res = await PATCH(makeRequest({ action: 'approve' }), { params: PARAMS });
      expect(res.status).toBe(401);
    });

    it('returns 403 if user is neither server admin nor platform admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: false });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const res = await PATCH(makeRequest({ action: 'approve' }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 400 if action is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const res = await PATCH(makeRequest({ action: 'delete' }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('returns 404 if request not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: existSelect } = mockExistingRequest({ data: null });
      mockSupabase.from.mockReturnValueOnce({ select: existSelect });

      const res = await PATCH(makeRequest({ action: 'approve' }), { params: PARAMS });
      expect(res.status).toBe(404);
    });

    it('returns 200 on approve', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: existSelect } = mockExistingRequest();
      mockSupabase.from.mockReturnValueOnce({ select: existSelect });

      // Update: .from("server_permissions").update({is_member: true}).eq("id", requestId).select().single()
      const updated = { id: REQUEST_ID, is_member: true };
      const mockUpdateSingle = jest.fn().mockResolvedValueOnce({ data: updated, error: null });
      const mockUpdateSelect = jest.fn().mockReturnValueOnce({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValueOnce({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockUpdateEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await PATCH(makeRequest({ action: 'approve' }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.permission).toEqual(updated);
    });

    it('returns 200 on reject (deletes request)', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: existSelect } = mockExistingRequest();
      mockSupabase.from.mockReturnValueOnce({ select: existSelect });

      // Delete: .from("server_permissions").delete().eq("id", requestId)
      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockDelete = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockDelete });

      const res = await PATCH(makeRequest({ action: 'reject' }), { params: PARAMS });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 if approve update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: existSelect } = mockExistingRequest();
      mockSupabase.from.mockReturnValueOnce({ select: existSelect });

      const mockUpdateSingle = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const mockUpdateSelect = jest.fn().mockReturnValueOnce({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValueOnce({ select: mockUpdateSelect });
      const mockUpdate = jest.fn().mockReturnValueOnce({ eq: mockUpdateEq });
      mockSupabase.from.mockReturnValueOnce({ update: mockUpdate });

      const res = await PATCH(makeRequest({ action: 'approve' }), { params: PARAMS });
      expect(res.status).toBe(500);
    });

    it('returns 500 if reject delete fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: MOCK_USER }, error: null });

      const { mockSelect: permSelect } = mockCallerPerm({ is_admin: true });
      mockSupabase.from.mockReturnValueOnce({ select: permSelect });

      const { mockSelect: profileSelect } = mockProfileQuery({ is_developer: false });
      mockSupabase.from.mockReturnValueOnce({ select: profileSelect });

      const { mockSelect: existSelect } = mockExistingRequest();
      mockSupabase.from.mockReturnValueOnce({ select: existSelect });

      const mockDeleteEq = jest.fn().mockResolvedValueOnce({ error: { message: 'DB error' } });
      const mockDelete = jest.fn().mockReturnValueOnce({ eq: mockDeleteEq });
      mockSupabase.from.mockReturnValueOnce({ delete: mockDelete });

      const res = await PATCH(makeRequest({ action: 'reject' }), { params: PARAMS });
      expect(res.status).toBe(500);
    });
  });
});
