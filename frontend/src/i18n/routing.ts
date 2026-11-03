import { defineRouting } from 'next-intl/routing';

export const SUPPORTED_LOCALES = ['vi', 'en'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'vi';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

export function isValidLocale(value: unknown): value is AppLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function resolveLocale(value: unknown): AppLocale {
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Strips any leading `/vi` or `/en` segment from a pathname, returning a clean
 * logical pathname starting with `/` (e.g. `/vi/login` -> `/login`, `/en` -> `/`).
 */
export function stripLocalePrefix(pathname: string): string {
  if (!pathname || !pathname.startsWith('/')) {
    return '/';
  }

  const segments = pathname.split('/');
  const firstSegment = segments[1];
  if (isValidLocale(firstSegment)) {
    const rest = '/' + segments.slice(2).join('/');
    return rest === '/' || rest === '' ? '/' : rest.replace(/\/+$/, '');
  }

  return pathname === '' ? '/' : pathname;
}

/**
 * Prepends the active locale prefix to an internal path (preserving query string and hash),
 * while leaving external URLs, `mailto:`, `tel:`, and `/api/*` untouched.
 */
export function localizePath(
  href: string,
  locale: AppLocale,
  prefixEnabled = true,
): string {
  if (!href) {
    return prefixEnabled ? `/${locale}` : '/';
  }

  // Never localize external URLs, mailto/tel links, or API endpoints
  if (
    /^(https?:\/\/|mailto:|tel:|#)/i.test(href) ||
    href.startsWith('/api/') ||
    href === '/api'
  ) {
    return href;
  }

  if (!prefixEnabled) {
    return href;
  }

  // Split path and query/hash
  const match = href.match(/^([^?#]*)(.*)$/);
  const rawPathname = match?.[1] || '/';
  const suffix = match?.[2] || '';

  const cleanPath = stripLocalePrefix(
    rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`,
  );

  const localizedPathname =
    cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`;

  return `${localizedPathname}${suffix}`;
}

/**
 * Persists the user's selected locale to the NEXT_LOCALE cookie and updates
 * the document's root <html lang> attribute on the client.
 */
export function persistClientLocalePreference(targetLocale: AppLocale): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE_NAME}=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.setAttribute('lang', targetLocale);
  }
}

/**
 * Builds the target URL when switching locales on the current page,
 * preserving the logical route and any query parameters.
 */
export function buildLocaleSwitchUrl(
  pathname: string,
  searchParamsString: string | null | undefined,
  targetLocale: AppLocale,
): string {
  const cleanPathname = stripLocalePrefix(pathname || '/');
  const base =
    cleanPathname === '/'
      ? `/${targetLocale}`
      : `/${targetLocale}${cleanPathname}`;
  const cleanSearch = searchParamsString
    ? searchParamsString.replace(/^\?/, '')
    : '';
  return cleanSearch ? `${base}?${cleanSearch}` : base;
}
