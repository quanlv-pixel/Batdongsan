import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as contactRequestHandler } from '@/app/api/contact-requests/route';

const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    delete: mockCookieDelete,
    get: mockCookieGet,
  }),
}));

describe('BFF Contact Requests Route Handler (/api/contact-requests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieDelete.mockReset();
    mockCookieGet.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Returns 401 when unauthenticated (no session cookie)', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.statusCode).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('2. Returns 400 when listingId is missing', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.statusCode).toBe(400);
    expect(data.message).toContain('listingId');
  });

  it('3. Returns 400 when contactConsent is false or missing', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: false,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('đồng ý với điều khoản liên hệ');
  });

  it('4. Returns 400 when message exceeds 1000 characters', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    const longMessage = 'a'.repeat(1001);
    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        message: longMessage,
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('1000 ký tự');
  });

  it('5. Successfully forwards request to NestJS backend and returns 201', async () => {
    mockCookieGet.mockReturnValue({ value: 'mock_jwt_session_cookie' });

    const mockBackendResponse = {
      id: 'req_test_01',
      listingId: 'listing_01',
      buyerId: 'usr_buyer_1',
      message: 'Tôi muốn tư vấn pháp lý.',
      contactConsent: true,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      assignedAgentId: 'usr_agent_1',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockBackendResponse,
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        message: 'Tôi muốn tư vấn pháp lý.',
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe('req_test_01');
    expect(data.status).toBe('IN_PROGRESS');

    // Verify Authorization header was forwarded
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contact-requests'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock_jwt_session_cookie',
        }),
      }),
    );
  });

  it('6. Clears session cookie and returns 401 when backend token expires', async () => {
    mockCookieGet.mockReturnValue({ value: 'expired_jwt_token' });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(401);
    expect(mockCookieDelete).toHaveBeenCalledWith('batdongsan_session');
  });

  it('7. Forwards backend 400 error (e.g. self-listing or unapproved listing)', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 400,
        message: 'Cannot create a contact request for your own listing',
      }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: true,
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe(
      'Cannot create a contact request for your own listing',
    );
  });

  it('8. Returns 400 when body is an array or malformed', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([1, 2, 3]),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Bad Request');
  });

  it('9. Returns 400 when message is not a string type', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: true,
        message: { malicious: 'object' },
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('Lời nhắn phải là chuỗi ký tự hợp lệ');
  });

  it('10. Returns 500 with generic Internal Server Error without leaking internal stack/exception', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid_jwt_token' });
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Sensitive DB Connection string leaked!'));

    const req = new NextRequest('http://localhost:3000/api/contact-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'listing_01',
        contactConsent: true,
        message: 'Hello',
      }),
    });

    const res = await contactRequestHandler(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');
    expect(data.error).not.toContain('Sensitive DB');
  });
});