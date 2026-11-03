import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NextRequest } from 'next/server';
import {
  isValidLocale,
  resolveLocale,
  stripLocalePrefix,
  localizePath,
  buildLocaleSwitchUrl,
  LOCALE_COOKIE_NAME,
} from '@/i18n/routing';
import { AppLocaleProvider, getDictionary } from '@/i18n';
import {
  buildLocalizedPageMetadata,
  getSiteBaseUrl,
} from '@/i18n/metadata';
import proxy from '@/proxy';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import {
  formatVndPrice,
  formatArea,
  formatPricePerSqm,
  formatListingDate,
  getPropertyTypeLabel,
  getTransactionBadgeLabel,
} from '@/lib/formatters';
import { HomePageShell, LatestListingsSection } from '@/app/[locale]/page';
import LoginPage from '@/app/[locale]/login/page';
import RegisterPage from '@/app/[locale]/register/page';
import * as AuthContextModule from '@/context/AuthContext';
import { PublicListingsResponse } from '@/types';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const samplePublicResponse: PublicListingsResponse = {
  data: [
    {
      id: 'seed_listing_01',
      title: 'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
      description: 'Căn hộ tầng 18 tháp Aqua 1.',
      propertyType: 'APARTMENT',
      transactionType: 'FOR_SALE',
      priceVnd: '7800000000',
      rentalPeriod: null,
      areaSqm: 78.5,
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      status: 'APPROVED',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      images: [
        {
          id: 'seed_listing_01_img_1',
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
          order: 0,
        },
      ],
    },
  ],
  meta: {
    total: 1,
    page: 1,
    limit: 6,
    totalPages: 1,
  },
};

describe('Phase 2E-2A.1 Multilingual Foundation (VI / EN) Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    document.cookie = `${LOCALE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.documentElement.setAttribute('lang', 'vi');

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Locale Routing & URL Helpers (src/i18n/routing.ts)', () => {
    it('validates and resolves locales with "vi" as default', () => {
      expect(isValidLocale('vi')).toBe(true);
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);

      expect(resolveLocale('en')).toBe('en');
      expect(resolveLocale('vi')).toBe('vi');
      expect(resolveLocale('invalid')).toBe('vi');
      expect(resolveLocale(null)).toBe('vi');
    });

    it('strips locale prefixes cleanly from pathnames', () => {
      expect(stripLocalePrefix('/vi')).toBe('/');
      expect(stripLocalePrefix('/en')).toBe('/');
      expect(stripLocalePrefix('/vi/login')).toBe('/login');
      expect(stripLocalePrefix('/en/register')).toBe('/register');
      expect(stripLocalePrefix('/bat-dong-san')).toBe('/bat-dong-san');
    });

    it('localizes internal paths while preserving query strings and leaving /api/* untouched', () => {
      expect(localizePath('/', 'vi')).toBe('/vi');
      expect(localizePath('/', 'en')).toBe('/en');
      expect(localizePath('/login', 'en')).toBe('/en/login');
      expect(
        localizePath(
          '/bat-dong-san?transactionType=FOR_SALE&propertyType=APARTMENT',
          'en',
        ),
      ).toBe(
        '/en/bat-dong-san?transactionType=FOR_SALE&propertyType=APARTMENT',
      );
      expect(localizePath('/api/auth/me', 'en')).toBe('/api/auth/me');
      expect(localizePath('https://example.com', 'en')).toBe(
        'https://example.com',
      );
    });

    it('builds locale switch URLs preserving current route and query params', () => {
      expect(buildLocaleSwitchUrl('/vi', '', 'en')).toBe('/en');
      expect(buildLocaleSwitchUrl('/en/login', '', 'vi')).toBe('/vi/login');
      expect(
        buildLocaleSwitchUrl(
          '/vi/register',
          '?intent=OWNER&utm_source=hero',
          'en',
        ),
      ).toBe('/en/register?intent=OWNER&utm_source=hero');
    });
  });

  describe('2. Proxy Locale Resolution & Backward Compatibility (src/proxy.ts)', () => {
    it('redirects first-time visitors on /, /login, /register to /vi* regardless of Accept-Language', () => {
      const reqRoot = new NextRequest('http://localhost:3000/', {
        headers: { 'accept-language': 'en-US,en;q=0.9' },
      });
      const resRoot = proxy(reqRoot);
      expect(resRoot.status).toBe(307);
      expect(resRoot.headers.get('location')).toBe('http://localhost:3000/vi');
      expect(resRoot.cookies.get(LOCALE_COOKIE_NAME)?.value).toBe('vi');

      const reqLogin = new NextRequest(
        'http://localhost:3000/login?returnTo=%2Fdashboard',
        {
          headers: { 'accept-language': 'en-US,en;q=0.9' },
        },
      );
      const resLogin = proxy(reqLogin);
      expect(resLogin.status).toBe(307);
      expect(resLogin.headers.get('location')).toBe(
        'http://localhost:3000/vi/login?returnTo=%2Fdashboard',
      );
    });

    it('redirects unprefixed routes to /en* when NEXT_LOCALE=en cookie is present', () => {
      const req = new NextRequest('http://localhost:3000/register', {
        headers: { cookie: `${LOCALE_COOKIE_NAME}=en` },
      });
      const res = proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(
        'http://localhost:3000/en/register',
      );
      expect(res.cookies.get(LOCALE_COOKIE_NAME)?.value).toBe('en');
    });

    it('excludes all /api/auth/* BFF routes and static files from locale redirects', () => {
      for (const bffPath of [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/me',
      ]) {
        const apiReq = new NextRequest(`http://localhost:3000${bffPath}`);
        const apiRes = proxy(apiReq);
        expect(apiRes.headers.get('location')).toBeNull();
        expect(apiRes.status).toBe(200);
      }

      const assetReq = new NextRequest('http://localhost:3000/favicon.ico');
      const assetRes = proxy(assetReq);
      expect(assetRes.headers.get('location')).toBeNull();
    });
  });

  describe('3. Locale-Aware Formatters (src/lib/formatters.ts)', () => {
    it('formats VND prices, areas, dates, property types, and badges in English when locale="en"', () => {
      expect(formatVndPrice('7800000000', { locale: 'en' })).toBe('7.8B VND');
      expect(
        formatVndPrice('22000000', {
          transactionType: 'FOR_RENT',
          rentalPeriod: 'MONTH',
          locale: 'en',
        }),
      ).toBe('22M VND/month');
      expect(formatVndPrice('0', { locale: 'en' })).toBe('Contact for price');
      expect(formatArea(78.5, 'en')).toBe('78.5 m²');
      expect(formatPricePerSqm('7800000000', 100, 'FOR_SALE', 'en')).toBe(
        '~ 78M VND/m²',
      );
      expect(formatListingDate('2026-11-01T10:00:00.000Z', 'en')).toBe(
        '01 Nov 2026',
      );
      expect(getPropertyTypeLabel('APARTMENT', 'en')).toBe('Apartment');
      expect(getPropertyTypeLabel('HOUSE', 'en')).toBe('House');
      expect(getPropertyTypeLabel('VILLA', 'en')).toBe('Villa');
      expect(getPropertyTypeLabel('LAND', 'en')).toBe('Land');
      expect(getTransactionBadgeLabel('FOR_SALE', 'APARTMENT', 'en')).toBe(
        'Apartment for Sale',
      );
      expect(getTransactionBadgeLabel('FOR_RENT', 'APARTMENT', 'en')).toBe(
        'Apartment for Rent',
      );
    });
  });

  describe('4. LanguageSwitcher Component (src/components/common/LanguageSwitcher.tsx)', () => {
    it('renders VI and EN options, indicates active locale, and switches locale while preserving path and query', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <LanguageSwitcher
            currentPathOverride="/vi/login"
            currentSearchOverride="?redirect=home"
          />
        </AppLocaleProvider>,
      );

      const viBtn = screen.getByTestId('lang-switch-vi');
      const enBtn = screen.getByTestId('lang-switch-en');

      expect(viBtn.getAttribute('aria-pressed')).toBe('true');
      expect(enBtn.getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(enBtn);

      expect(mockPush).toHaveBeenCalledWith('/en/login?redirect=home');
      expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=en`);
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('5. English UI Rendering & Metadata Verification', () => {
    it('renders Homepage in English without mixed Vietnamese UI strings while preserving user-generated listing titles', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => samplePublicResponse,
      } as Response);

      const listingsSlot = await LatestListingsSection({ locale: 'en' });
      render(<HomePageShell locale="en" listingsSlot={listingsSlot} />);

      expect(
        screen.getByRole('heading', {
          name: /Find the Right Property for You/i,
        }),
      ).toBeDefined();
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /Explore Properties/i,
        }),
      ).toBeDefined();
      expect(
        screen.getByRole('heading', { name: /Latest Properties/i }),
      ).toBeDefined();
      expect(
        screen.getByRole('heading', {
          name: /A Trusted & Efficient Real Estate Platform/i,
        }),
      ).toBeDefined();

      // Formatted price and badge in English
      expect(screen.getByText('7.8B VND')).toBeDefined();
      expect(screen.getByText('Apartment for Sale')).toBeDefined();

      // Original user-generated listing title & administrative location remain intact
      expect(
        screen.getByText(
          'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
        ),
      ).toBeDefined();
      expect(
        screen.getByText('Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'),
      ).toBeDefined();
    });

    it('renders LoginPage and RegisterPage in English with English validation messages', async () => {
      const { unmount } = render(
        <AppLocaleProvider
          locale="en"
          messages={getDictionary('en')}
          prefixEnabled={true}
        >
          <LoginPage />
        </AppLocaleProvider>,
      );

      expect(
        screen.getByRole('heading', { name: 'Sign In' }),
      ).toBeDefined();
      expect(
        screen.getByPlaceholderText('Enter your email address'),
      ).toBeDefined();
      expect(screen.getByText('Forgot password?')).toBeDefined();

      // Submit empty login form -> shows English validation message
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
      });
      expect(screen.getByRole('alert')).toBeDefined();
      expect(
        screen.getByText('Please enter both your email and password'),
      ).toBeDefined();

      // Open forgot password modal in English
      fireEvent.click(screen.getByText('Forgot password?'));
      expect(screen.getByText('Password Recovery')).toBeDefined();
      expect(
        screen.getByText(/Feature Under Development/i),
      ).toBeDefined();

      unmount();

      render(
        <AppLocaleProvider
          locale="en"
          messages={getDictionary('en')}
          prefixEnabled={true}
        >
          <RegisterPage />
        </AppLocaleProvider>,
      );

      expect(
        screen.getByRole('heading', { name: 'Create an Account' }),
      ).toBeDefined();
      expect(screen.getByText('Buy or Rent Property')).toBeDefined();
      expect(screen.getByText('List Property as Owner')).toBeDefined();
      expect(screen.getByText('Real Estate Agent')).toBeDefined();

      // Submit empty registration form -> shows missing fullName validation in English
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /Create Account/i }),
        );
      });
      expect(
        screen.getByText('Please enter your full name'),
      ).toBeDefined();

      // Trigger English short password validation error
      fireEvent.change(screen.getByPlaceholderText('Nguyen Van A'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
        target: { value: 'john@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: '12345' },
      });
      fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), {
        target: { value: '12345' },
      });
      fireEvent.click(screen.getByRole('checkbox'));

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /Create Account/i }),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters long'),
        ).toBeDefined();
      });
    });

    it('preserves controlled form state across locale provider updates on LoginPage and RegisterPage', () => {
      const { rerender } = render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <LoginPage />
        </AppLocaleProvider>,
      );

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
      const passwordInput = document.getElementById(
        'password',
      ) as HTMLInputElement;
      const rememberCheckbox = screen.getByRole(
        'checkbox',
      ) as HTMLInputElement;

      fireEvent.change(emailInput, {
        target: { value: 'test-preserve@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'SafePass123!' },
      });
      fireEvent.click(rememberCheckbox);

      // Re-render under English locale provider
      rerender(
        <AppLocaleProvider
          locale="en"
          messages={getDictionary('en')}
          prefixEnabled={true}
        >
          <LoginPage />
        </AppLocaleProvider>,
      );

      expect(emailInput.value).toBe('test-preserve@example.com');
      expect(passwordInput.value).toBe('SafePass123!');
      expect(rememberCheckbox.checked).toBe(true);
      expect(
        screen.getByRole('heading', { name: 'Sign In' }),
      ).toBeDefined();
    });

    it('builds localized metadata with consistent origin across canonical, hreflang, and OpenGraph in local dev and configured production', () => {
      // 1. Local development fallback (NODE_ENV !== 'production', no NEXT_PUBLIC_SITE_URL)
      const localEnv = { NODE_ENV: 'development', PORT: '3000' };
      const viHomeMeta = buildLocalizedPageMetadata('vi', '/', localEnv);
      expect(viHomeMeta.alternates?.canonical).toBe(
        'http://localhost:3000/vi',
      );
      expect(viHomeMeta.alternates?.languages).toEqual({
        vi: 'http://localhost:3000/vi',
        en: 'http://localhost:3000/en',
        'x-default': 'http://localhost:3000/vi',
      });
      expect(viHomeMeta.openGraph?.url).toBe('http://localhost:3000/vi');

      // 2. Configured production origin via NEXT_PUBLIC_SITE_URL
      const prodEnv = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://batdongsan.example.edu.vn',
      };
      const enLoginMeta = buildLocalizedPageMetadata('en', '/login', prodEnv);
      expect(enLoginMeta.title).toBe('Sign In | Batdongsan');
      expect(enLoginMeta.alternates?.canonical).toBe(
        'https://batdongsan.example.edu.vn/en/login',
      );
      expect(enLoginMeta.alternates?.languages).toEqual({
        vi: 'https://batdongsan.example.edu.vn/vi/login',
        en: 'https://batdongsan.example.edu.vn/en/login',
        'x-default': 'https://batdongsan.example.edu.vn/vi/login',
      });
      expect(enLoginMeta.openGraph?.url).toBe(
        'https://batdongsan.example.edu.vn/en/login',
      );

      // 3. Unconfigured production environment: must NOT emit localhost URLs
      const unconfiguredProdEnv = { NODE_ENV: 'production' };
      const prodNoOriginMeta = buildLocalizedPageMetadata(
        'vi',
        '/register',
        unconfiguredProdEnv,
      );
      expect(prodNoOriginMeta.metadataBase).toBeUndefined();
      expect(prodNoOriginMeta.alternates?.canonical).toBe('/vi/register');
      expect(prodNoOriginMeta.alternates?.languages).toEqual({
        vi: '/vi/register',
        en: '/en/register',
        'x-default': '/vi/register',
      });
      expect(prodNoOriginMeta.openGraph?.url).toBe('/vi/register');
    });

    it('verifies SEO origin resolution hierarchy, precedence order, and localhost protection', () => {
      // 1. NEXT_PUBLIC_SITE_URL takes top precedence
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'https://primary.example.com',
          SITE_URL: 'https://secondary.example.com',
          VERCEL_PROJECT_PRODUCTION_URL: 'project.vercel.app',
          VERCEL_URL: 'preview.vercel.app',
        })?.origin,
      ).toBe('https://primary.example.com');

      // 2. SITE_URL is supported when NEXT_PUBLIC_SITE_URL is absent or empty
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: '',
          SITE_URL: 'https://server.example.com',
          VERCEL_PROJECT_PRODUCTION_URL: 'project.vercel.app',
        })?.origin,
      ).toBe('https://server.example.com');

      // 3. VERCEL_PROJECT_PRODUCTION_URL is preferred over VERCEL_URL
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'production',
          VERCEL_PROJECT_PRODUCTION_URL: 'custom-proj.vercel.app',
          VERCEL_URL: 'preview-hash.vercel.app',
        })?.origin,
      ).toBe('https://custom-proj.vercel.app');

      // 4. VERCEL_URL is fallback when higher-priority origins are absent
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'production',
          VERCEL_URL: 'deployment.vercel.app',
        })?.origin,
      ).toBe('https://deployment.vercel.app');

      // 5. Non-production without an explicit origin (or empty string) falls back to localhost
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'development',
          NEXT_PUBLIC_SITE_URL: '',
          PORT: '3000',
        })?.origin,
      ).toBe('http://localhost:3000');

      // 6. Production without configured origin (or empty string) returns null
      expect(
        getSiteBaseUrl({
          NODE_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: '',
        }),
      ).toBeNull();
    });
  });
});
