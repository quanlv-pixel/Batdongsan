import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as meHandler } from '@/app/api/auth/me/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';

const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: mockCookieSet,
    delete: mockCookieDelete,
    get: mockCookieGet,
  }),
}));

function createMockJwt(expOffsetSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expOffsetSec;
  const payload = Buffer.from(JSON.stringify({ sub: 'usr_123', exp })).toString('base64');
  return `${header}.${payload}.mockSignature`;
}

describe('BFF Authentication Route Handlers Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieSet.mockReset();
    mockCookieDelete.mockReset();
    mockCookieGet.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // A. Login Route Handler Tests
  // ─────────────────────────────────────────────────────────────
  describe('Login Route Handler (/api/auth/login)', () => {
    it('1. Successful login sets HttpOnly session cookie when rememberMe is false', async () => {
      const mockJwt = createMockJwt(900); // 15 mins
      const mockUser = { id: 'usr_1', email: 'test@example.com', fullName: 'User', role: 'BUYER' };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ accessToken: mockJwt, user: mockUser }),
      } as unknown as Response);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ user: mockUser });
      // CRITICAL: Raw JWT must NEVER be returned to the client in JSON
      expect(data.accessToken).toBeUndefined();

      // Verify that rememberMe was NOT forwarded to NestJS
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        }),
      );

      // Verify session cookie: HttpOnly, Lax, Path /, NO maxAge property
      expect(mockCookieSet).toHaveBeenCalledWith(
        'batdongsan_session',
        mockJwt,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      const cookieOptions = mockCookieSet.mock.calls[0][2];
      expect(cookieOptions.maxAge).toBeUndefined();
    });

    it('2. Remember-me true sets persistent cookie strictly bounded by JWT exp', async () => {
      const mockJwt = createMockJwt(900); // 15 mins (approx 900s)
      const mockUser = { id: 'usr_1', email: 'test@example.com', fullName: 'User', role: 'BUYER' };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ accessToken: mockJwt, user: mockUser }),
      } as unknown as Response);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      expect(mockCookieSet).toHaveBeenCalledWith(
        'batdongsan_session',
        mockJwt,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      const cookieOptions = mockCookieSet.mock.calls[0][2];
      // maxAge must be <= 900s (and > 800s) and NEVER 7 days (604800s)!
      expect(cookieOptions.maxAge).toBeDefined();
      expect(cookieOptions.maxAge).toBeLessThanOrEqual(900);
      expect(cookieOptions.maxAge).toBeGreaterThan(850);
    });

    it('3. Invalid or non-JWT accessToken safely falls back to session cookie (no maxAge)', async () => {
      const opaqueToken = 'non-jwt-opaque-token';
      const mockUser = { id: 'usr_1', email: 'test@example.com', fullName: 'User', role: 'BUYER' };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ accessToken: opaqueToken, user: mockUser }),
      } as unknown as Response);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const cookieOptions = mockCookieSet.mock.calls[0][2];
      expect(cookieOptions.maxAge).toBeUndefined();
    });

    it('4. Upstream 401 Unauthorized is forwarded safely without setting cookie', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ statusCode: 401, message: 'Invalid credentials', error: 'Unauthorized' }),
      } as unknown as Response);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Invalid credentials');
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('5. Upstream network failure returns 500 without leaking secrets or stack trace', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.message).toBe('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.');
      expect(mockCookieSet).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // B. Logout Route Handler Tests
  // ─────────────────────────────────────────────────────────────
  describe('Logout Route Handler (/api/auth/logout)', () => {
    it('1. Successfully deletes session cookie and returns success response', async () => {
      const res = await logoutHandler();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ success: true, message: 'Đăng xuất thành công' });
      expect(mockCookieDelete).toHaveBeenCalledWith('batdongsan_session');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // C. Me Route Handler Tests
  // ─────────────────────────────────────────────────────────────
  describe('Me Route Handler (/api/auth/me)', () => {
    it('1. Returns 401 when no session cookie is present', async () => {
      mockCookieGet.mockReturnValueOnce(undefined);

      const res = await meHandler();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Unauthenticated');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('2. Forwards Bearer token and returns user info without raw JWT', async () => {
      mockCookieGet.mockReturnValueOnce({ value: 'valid-jwt-token' });
      const mockUser = {
        id: 'usr_1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'BUYER',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser,
      } as unknown as Response);

      const res = await meHandler();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ user: mockUser });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer valid-jwt-token' },
        }),
      );
    });

    it('3. Upstream 401 cleans up session cookie and returns 401', async () => {
      mockCookieGet.mockReturnValueOnce({ value: 'expired-jwt-token' });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ statusCode: 401, message: 'jwt expired' }),
      } as unknown as Response);

      const res = await meHandler();
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Session expired');
      expect(mockCookieDelete).toHaveBeenCalledWith('batdongsan_session');
    });

    it('4. Network failure in /me returns safe 500 error', async () => {
      mockCookieGet.mockReturnValueOnce({ value: 'some-token' });
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const res = await meHandler();
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.message).toBe('Lỗi xác thực người dùng. Vui lòng thử lại sau.');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // D. Register Route Handler Tests
  // ─────────────────────────────────────────────────────────────
  describe('Register Route Handler (/api/auth/register)', () => {
    it('1. Whitelists only allowed fields and strips phone, role, id, isActive', async () => {
      const mockResponseUser = {
        id: 'usr_new',
        email: 'new@example.com',
        fullName: 'New User',
        role: 'BUYER',
        registrationIntent: 'OWNER',
        createdAt: '2026-11-02T12:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponseUser,
      } as unknown as Response);

      const maliciousOrExtraPayload = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
        registrationIntent: 'OWNER',
        // Fields that MUST be stripped:
        phone: '0901234567',
        role: 'ADMIN',
        id: 'hacked_id',
        isActive: false,
        confirmPassword: 'password123',
      };

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousOrExtraPayload),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data).toEqual(mockResponseUser);

      // Verify that fetch was called ONLY with the 4 whitelisted fields
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'new@example.com',
            password: 'password123',
            fullName: 'New User',
            registrationIntent: 'OWNER',
          }),
        }),
      );

      // Registration must NOT establish a session cookie
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('2. Forwards upstream conflict (409) safely', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ statusCode: 409, message: 'Email is already registered', error: 'Conflict' }),
      } as unknown as Response);

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dup@example.com',
          password: 'password123',
          fullName: 'Dup User',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.message).toBe('Email is already registered');
    });

    it('3. Network failure returns safe 500 error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.message).toBe('Không thể kết nối đến máy chủ đăng ký. Vui lòng thử lại sau.');
    });
  });
});
