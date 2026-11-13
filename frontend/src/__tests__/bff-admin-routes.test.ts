import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAdminListingsHandler } from '@/app/api/admin/listings/route';
import { POST as moderateListingHandler } from '@/app/api/admin/listings/[id]/moderate/route';
import { GET as getListingHistoryHandler } from '@/app/api/admin/listings/[id]/history/route';
import { GET as getAdminRequestsHandler } from '@/app/api/admin/requests/route';
import { POST as assignRequestHandler } from '@/app/api/admin/requests/[id]/assign/route';
import { POST as reassignRequestHandler } from '@/app/api/admin/requests/[id]/reassign/route';
import { POST as reopenRequestHandler } from '@/app/api/admin/requests/[id]/reopen/route';
import { GET as getRequestAssignmentsHandler } from '@/app/api/admin/requests/[id]/assignments/route';
import { GET as getAdminUsersHandler } from '@/app/api/admin/users/route';
import { PATCH as updateUserRoleHandler } from '@/app/api/admin/users/[id]/role/route';
import { PATCH as updateUserStatusHandler } from '@/app/api/admin/users/[id]/status/route';
import { GET as getAdminAgentsHandler } from '@/app/api/admin/agents/route';
import { GET as getAdminMlsSharesHandler } from '@/app/api/admin/mls/route';
import { POST as revokeAdminMlsShareHandler } from '@/app/api/admin/mls/[id]/revoke/route';

const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: mockCookieGet,
  }),
}));

describe('BFF Admin Route Handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieGet.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/listings', () => {
    it('1. Returns 401 when session cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/admin/listings');
      const res = await getAdminListingsHandler(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.statusCode).toBe(401);
    });

    it('2. Forwards authorization bearer token to backend and returns data', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: 'lst_1', title: 'Test Listing' }], meta: { total: 1 } }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/listings?status=PENDING');
      const res = await getAdminListingsHandler(req);

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/listings/admin?status=PENDING'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer admin_jwt' },
        }),
      );
    });
  });

  describe('POST /api/admin/listings/[id]/moderate', () => {
    it('3. Forwards moderation payload with auth cookie', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'lst_1', status: 'APPROVED' }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/listings/lst_1/moderate', {
        method: 'POST',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const res = await moderateListingHandler(req, {
        params: Promise.resolve({ id: 'lst_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/listings/lst_1/moderate'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer admin_jwt',
          }),
        }),
      );
    });
  });

  describe('GET /api/admin/listings/[id]/history', () => {
    it('4. Forwards moderation history request', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'mod_1', toStatus: 'APPROVED' }]),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/listings/lst_1/history');
      const res = await getListingHistoryHandler(req, {
        params: Promise.resolve({ id: 'lst_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/listings/lst_1/moderation-history'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer admin_jwt' },
        }),
      );
    });
  });

  describe('Contact Requests BFF Handlers', () => {
    it('5. GET /api/admin/requests forwards query parameters', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], meta: { total: 0 } }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/requests?unassigned=true');
      const res = await getAdminRequestsHandler(req);

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/contact-requests?unassigned=true'),
        expect.anything(),
      );
    });

    it('6. POST /api/admin/requests/[id]/assign forwards assignment', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'asgn_1', isActive: true }),
          { status: 201 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/requests/req_1/assign', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'ag_1' }),
      });

      const res = await assignRequestHandler(req, {
        params: Promise.resolve({ id: 'req_1' }),
      });

      expect(res.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/contact-requests/req_1/assign'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('7. POST /api/admin/requests/[id]/reassign forwards reassignment', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'asgn_2', isActive: true }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/requests/req_1/reassign', {
        method: 'POST',
        body: JSON.stringify({ newAgentId: 'ag_2', reason: 'Workload balancing' }),
      });

      const res = await reassignRequestHandler(req, {
        params: Promise.resolve({ id: 'req_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/contact-requests/req_1/reassign'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('8. POST /api/admin/requests/[id]/reopen forwards reopen request', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'req_1', status: 'IN_PROGRESS' }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/requests/req_1/reopen', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Buyer called back with revised offer' }),
      });

      const res = await reopenRequestHandler(req, {
        params: Promise.resolve({ id: 'req_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/contact-requests/req_1/reopen'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('9. GET /api/admin/requests/[id]/assignments forwards history call', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'asgn_1' }]),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/requests/req_1/assignments');
      const res = await getRequestAssignmentsHandler(req, {
        params: Promise.resolve({ id: 'req_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/contact-requests/req_1/assignments'),
        expect.anything(),
      );
    });
  });

  describe('Users Management BFF Handlers', () => {
    it('10. GET /api/admin/users forwards query', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], meta: { total: 0 } }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/users?role=AGENT');
      const res = await getAdminUsersHandler(req);

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users?role=AGENT'),
        expect.anything(),
      );
    });

    it('11. PATCH /api/admin/users/[id]/role forwards role update', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'usr_1', role: 'AGENT' }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/users/usr_1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'AGENT' }),
      });

      const res = await updateUserRoleHandler(req, {
        params: Promise.resolve({ id: 'usr_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/usr_1/role'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('12. PATCH /api/admin/users/[id]/status forwards status toggle', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'usr_1', isActive: false }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/users/usr_1/status', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const res = await updateUserStatusHandler(req, {
        params: Promise.resolve({ id: 'usr_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/usr_1/status'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('13. GET /api/admin/agents forwards agents fetch', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 'ag_1', fullName: 'Agent 1' }]),
          { status: 200 },
        ),
      );

      const res = await getAdminAgentsHandler();
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/agents'),
        expect.anything(),
      );
    });
  });

  describe('MLS Oversight BFF Handlers', () => {
    it('14. GET /api/admin/mls forwards query', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [], meta: { total: 0 } }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/mls?isActive=true');
      const res = await getAdminMlsSharesHandler(req);

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mls/admin/shares?isActive=true'),
        expect.anything(),
      );
    });

    it('15. POST /api/admin/mls/[id]/revoke forwards revoke request', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'sh_1', isActive: false }),
          { status: 200 },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/admin/mls/sh_1/revoke', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin oversight revoke' }),
      });

      const res = await revokeAdminMlsShareHandler(req, {
        params: Promise.resolve({ id: 'sh_1' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mls/shares/sh_1/revoke'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('16. Returns generic 500 without leaking stack traces when fetch throws', async () => {
      mockCookieGet.mockReturnValue({ value: 'admin_jwt' });
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Sensitive PostgreSQL connection crash'));

      const req = new NextRequest('http://localhost:3000/api/admin/listings');
      const res = await getAdminListingsHandler(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.message).toBe('Internal Server Error');
      expect(data.error).toBeUndefined();
    });
  });
});
