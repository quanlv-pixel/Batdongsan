import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiClientError } from '@/lib/api-client';

describe('ApiClient Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Successful JSON response: parses and returns typed data', async () => {
    const mockUser = {
      id: 'usr_123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'BUYER',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ user: mockUser }),
    } as unknown as Response);

    const res = await apiClient.getMe();
    expect(res.user).toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
  });

  it('2. HTTP 400 Validation Error: normalizes error array into ApiClientError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 400,
        message: ['email must be a valid email', 'password is required'],
        error: 'Bad Request',
      }),
    } as unknown as Response);

    await expect(
      apiClient.login({ email: 'bad-email', password: '' }),
    ).rejects.toThrow(ApiClientError);

    try {
      await apiClient.login({ email: 'bad-email', password: '' });
    } catch (err: unknown) {
      const clientErr = err as ApiClientError;
      expect(clientErr.statusCode).toBe(400);
      expect(clientErr.errorDetails).toEqual([
        'email must be a valid email',
        'password is required',
      ]);
      expect(clientErr.message).toContain('email must be a valid email');
    }
  });

  it('3. HTTP 401 Unauthenticated: throws with 401 statusCode', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      }),
    } as unknown as Response);

    await expect(
      apiClient.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    });
  });

  it('4. HTTP 403 Forbidden: throws with 403 statusCode', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      }),
    } as unknown as Response);

    await expect(apiClient.request('/api/admin/restricted')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden resource',
    });
  });

  it('5. HTTP 404 Not Found: throws with 404 statusCode', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      }),
    } as unknown as Response);

    await expect(apiClient.request('/api/users/non-existent')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('6. HTTP 409 Conflict: throws with 409 statusCode and conflict message', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 409,
        message: 'Email is already registered',
        error: 'Conflict',
      }),
    } as unknown as Response);

    await expect(
      apiClient.register({
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Email is already registered',
    });
  });

  it('7. Network Failure / Abort: normalizes to ApiClientError with 500 / 408', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(apiClient.getMe()).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch',
      rawError: 'Network Error',
    });
  });

  it('8. HTTP 204 No Content: resolves empty object without error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    } as unknown as Response);

    const res = await apiClient.request('/api/test/no-content');
    expect(res).toEqual({});
  });

  it('9. Login payload propagation: includes rememberMe in POST body', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        user: { id: 'u1', email: 'test@example.com', fullName: 'User', role: 'BUYER' },
      }),
    } as unknown as Response);

    await apiClient.login({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        }),
      }),
    );
  });
});
