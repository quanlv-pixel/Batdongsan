import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getMyListingsHandler } from '@/app/api/listings/mine/route';
import { POST as createListingHandler } from '@/app/api/listings/route';
import { POST as submitListingHandler } from '@/app/api/listings/[id]/submit/route';
import { GET as getAssignedLeadsHandler } from '@/app/api/contact-requests/assigned/route';
import { GET as getForOwnedListingsHandler } from '@/app/api/contact-requests/for-owned-listings/route';
import { PATCH as updateLeadStatusHandler } from '@/app/api/contact-requests/[id]/status/route';
import { GET as getReceivedMlsHandler } from '@/app/api/mls/shares/received/route';
import { POST as grantMlsShareHandler } from '@/app/api/mls/shares/route';
import { POST as revokeMlsShareHandler } from '@/app/api/mls/shares/[id]/revoke/route';

const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    delete: mockCookieDelete,
    get: mockCookieGet,
  }),
}));

describe('BFF Workspace Route Handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieDelete.mockReset();
    mockCookieGet.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/listings/mine', () => {
    it('1. Returns 401 when session cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/listings/mine');
      const res = await getMyListingsHandler(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.statusCode).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('2. Forwards authorization bearer token to backend and returns data', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid_session_jwt' });

      const mockResponse = {
        data: [{ id: 'listing_01', title: 'Nhà phố đẹp' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const req = new NextRequest('http://localhost:3000/api/listings/mine?page=1&status=APPROVED');
      const res = await getMyListingsHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].id).toBe('listing_01');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/listings/mine?page=1&status=APPROVED'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_session_jwt',
          }),
        }),
      );
    });
  });

  describe('POST /api/listings', () => {
    it('3. Returns 401 when session cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });
      const res = await createListingHandler(req);

      expect(res.status).toBe(401);
    });

    it('4. Returns 400 when required fields are missing or invalid', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid_session_jwt' });

      // Area is invalid (0)
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nhà phố trung tâm',
          description: 'Mô tả chi tiết căn nhà với diện tích đầy đủ thông tin',
          propertyType: 'HOUSE',
          transactionType: 'FOR_SALE',
          priceVnd: '2000000000',
          areaSqm: 0, // Invalid!
          province: 'Hà Nội',
          district: 'Cầu Giấy',
        }),
      });
      const res = await createListingHandler(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('Diện tích');
    });

    it('5. Successfully forwards valid listing creation to backend', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid_session_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'new_listing_id', title: 'Nhà phố mới' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nhà phố mới hoàn thiện',
          description: 'Mô tả chi tiết căn nhà với diện tích đầy đủ thông tin',
          propertyType: 'HOUSE',
          transactionType: 'FOR_SALE',
          priceVnd: '5000000000',
          areaSqm: 80,
          province: 'Hà Nội',
          district: 'Nam Từ Liêm',
        }),
      });
      const res = await createListingHandler(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('new_listing_id');
    });
  });

  describe('POST /api/listings/[id]/submit', () => {
    it('6. Forwards submit request with session bearer token', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid_session_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'draft_01', status: 'PENDING' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const req = new NextRequest('http://localhost:3000/api/listings/draft_01/submit', {
        method: 'POST',
      });
      const res = await submitListingHandler(req, {
        params: Promise.resolve({ id: 'draft_01' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/listings/draft_01/submit'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_session_jwt',
          }),
        }),
      );
    });
  });

  describe('GET /api/contact-requests/assigned', () => {
    it('7. Forwards assigned requests query with auth token', async () => {
      mockCookieGet.mockReturnValue({ value: 'agent_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'req_01', buyer: { fullName: 'Nguyễn Văn A' } }],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/contact-requests/assigned');
      const res = await getAssignedLeadsHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].id).toBe('req_01');
    });
  });

  describe('PATCH /api/contact-requests/[id]/status', () => {
    it('8. Rejects invalid status transition in BFF', async () => {
      mockCookieGet.mockReturnValue({ value: 'agent_jwt' });

      const req = new NextRequest('http://localhost:3000/api/contact-requests/req_01/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });
      const res = await updateLeadStatusHandler(req, {
        params: Promise.resolve({ id: 'req_01' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('IN_PROGRESS');
    });

    it('9. Successfully forwards COMPLETED status transition', async () => {
      mockCookieGet.mockReturnValue({ value: 'agent_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'req_01', status: 'COMPLETED' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/contact-requests/req_01/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', note: 'Tư vấn thành công' }),
      });
      const res = await updateLeadStatusHandler(req, {
        params: Promise.resolve({ id: 'req_01' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('COMPLETED');
    });
  });

  describe('GET /api/contact-requests/for-owned-listings', () => {
    it('10. Forwards inquiries query to backend', async () => {
      mockCookieGet.mockReturnValue({ value: 'owner_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'inq_01', listingId: 'listing_01' }],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/contact-requests/for-owned-listings');
      const res = await getForOwnedListingsHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].id).toBe('inq_01');
    });
  });

  describe('MLS Routes', () => {
    it('11. GET /api/mls/shares/received forwards to backend', async () => {
      mockCookieGet.mockReturnValue({ value: 'agent_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'share_01', permission: 'VIEW' }],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/mls/shares/received');
      const res = await getReceivedMlsHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].permission).toBe('VIEW');
    });

    it('12. POST /api/mls/shares validates recipientId and forwards grant', async () => {
      mockCookieGet.mockReturnValue({ value: 'agent_jwt' });

      // Missing recipientId
      const badReq = new NextRequest('http://localhost:3000/api/mls/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'list_01' }),
      });
      const badRes = await grantMlsShareHandler(badReq);
      expect(badRes.status).toBe(400);

      // Valid grant
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'new_share_01', permission: 'VIEW' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const validReq = new NextRequest('http://localhost:3000/api/mls/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: 'list_01',
          recipientId: 'agent_b',
          permission: 'VIEW',
        }),
      });
      const validRes = await grantMlsShareHandler(validReq);
      expect(validRes.status).toBe(201);
    });

    it('13. POST /api/mls/shares/[id]/revoke forwards revoke request', async () => {
      mockCookieGet.mockReturnValue({ value: 'owner_jwt' });

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, message: 'MLS share revoked successfully' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const req = new NextRequest('http://localhost:3000/api/mls/shares/share_01/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Thu hồi hợp tác' }),
      });
      const res = await revokeMlsShareHandler(req, {
        params: Promise.resolve({ id: 'share_01' }),
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mls/shares/share_01/revoke'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer owner_jwt',
          }),
        }),
      );
    });
  });
});
