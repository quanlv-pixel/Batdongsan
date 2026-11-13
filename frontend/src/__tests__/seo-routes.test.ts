import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { POST as loginHandler } from '@/app/api/auth/login/route';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  }),
}));

describe('Phase 2F SEO & Security Hardening Verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('robots() blocks admin, quan-tri, quan-ly, workspace, and api routes while allowing public pages', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://batdongsan.example.com');
    const result = robots();

    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.userAgent).toBe('*');
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        '/admin',
        '/vi/admin',
        '/en/admin',
        '/quan-tri',
        '/quan-ly',
        '/workspace',
        '/api/',
      ]),
    );
    expect(rules.allow).toEqual(
      expect.arrayContaining([
        '/',
        '/vi',
        '/en',
        '/vi/bat-dong-san',
        '/en/bat-dong-san',
      ]),
    );
    expect(result.sitemap).toBe('https://batdongsan.example.com/sitemap.xml');
  });

  it('sitemap() exposes localized public routes with configured production origin and omits localhost in production', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://batdongsan.example.com');
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual([
      'https://batdongsan.example.com/vi',
      'https://batdongsan.example.com/en',
      'https://batdongsan.example.com/vi/bat-dong-san',
      'https://batdongsan.example.com/en/bat-dong-san',
    ]);

    // When running in production without NEXT_PUBLIC_SITE_URL, sitemap must not emit localhost
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(sitemap()).toEqual([]);
  });

  it('Auth BFF 500 error responses mask internal exception details', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:3001 secret'));

    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal Server Error');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('3001');
  });
});
