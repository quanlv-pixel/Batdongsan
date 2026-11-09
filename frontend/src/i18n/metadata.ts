import type { Metadata } from 'next';
import { getDictionary } from './dictionaries';
import { AppLocale, resolveLocale } from './routing';

/**
 * Resolves the configured site base URL from environment variables if present:
 * 1. NEXT_PUBLIC_SITE_URL (explicit public site URL, e.g. https://<your-domain>)
 * 2. SITE_URL (server-side site URL)
 * 3. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (when deployed on Vercel)
 * 4. In non-production (local dev / test), falls back to http://localhost:${PORT || 3000}.
 *
 * Returns null if running in production without any configured site origin,
 * preventing production canonical/hreflang/OpenGraph tags from emitting localhost URLs.
 */
export function getSiteBaseUrl(
  env: Record<string, string | undefined> = process.env,
): URL | null {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      return new URL(normalized);
    } catch {
      // Ignore malformed candidate and try next
    }
  }

  if (env.NODE_ENV !== 'production') {
    const port = env.PORT?.trim() || '3000';
    return new URL(`http://localhost:${port}`);
  }

  return null;
}

/**
 * Resolves a localized path (e.g. "/vi/login") against the configured site origin.
 * When a valid site origin is available, returns the full absolute URL without trailing slash
 * (e.g. "https://<origin>/vi/login" or "http://localhost:3000/vi/login" in local dev).
 * When no origin is configured in production, returns the relative path ("/vi/login").
 */
export function resolveMetadataUrl(
  pathname: string,
  baseUrl: URL | null,
): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!baseUrl) {
    return normalizedPath;
  }
  const origin = baseUrl.origin.replace(/\/+$/, '');
  return `${origin}${normalizedPath}`;
}

export function buildLocalizedPageMetadata(
  rawLocale: string,
  pagePath: '/' | '/login' | '/register' | '/bat-dong-san',
  env: Record<string, string | undefined> = process.env,
): Metadata {
  const locale: AppLocale = resolveLocale(rawLocale);
  const dict = getDictionary(locale);
  const siteBaseUrl = getSiteBaseUrl(env);

  const suffix = pagePath === '/' ? '' : pagePath;
  const canonicalPath = resolveMetadataUrl(`/${locale}${suffix}`, siteBaseUrl);
  const viPath = resolveMetadataUrl(`/vi${suffix}`, siteBaseUrl);
  const enPath = resolveMetadataUrl(`/en${suffix}`, siteBaseUrl);

  const title =
    pagePath === '/'
      ? dict.Metadata.homeTitle
      : pagePath === '/login'
        ? dict.Metadata.loginTitle
        : pagePath === '/register'
          ? dict.Metadata.registerTitle
          : dict.Metadata.searchTitle;

  const description =
    pagePath === '/'
      ? dict.Metadata.homeDescription
      : pagePath === '/login'
        ? dict.Metadata.loginDescription
        : pagePath === '/register'
          ? dict.Metadata.registerDescription
          : dict.Metadata.searchDescription;

  return {
    ...(siteBaseUrl ? { metadataBase: siteBaseUrl } : {}),
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        vi: viPath,
        en: enPath,
        'x-default': viPath,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: 'Batdongsan',
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      alternateLocale: locale === 'en' ? ['vi_VN'] : ['en_US'],
      type: 'website',
    },
  };
}


export function buildLocalizedListingDetailMetadata(
  rawLocale: string,
  listingId: string,
  listing: { title: string; description: string; images?: { url: string }[] } | null,
  env: Record<string, string | undefined> = process.env,
): Metadata {
  const locale: AppLocale = resolveLocale(rawLocale);
  const dict = getDictionary(locale);
  const siteBaseUrl = getSiteBaseUrl(env);

  const suffix = `/bat-dong-san/${listingId}`;
  const canonicalPath = resolveMetadataUrl(`/${locale}${suffix}`, siteBaseUrl);
  const viPath = resolveMetadataUrl(`/vi${suffix}`, siteBaseUrl);
  const enPath = resolveMetadataUrl(`/en${suffix}`, siteBaseUrl);

  const title = listing
    ? `${listing.title} | Batdongsan`
    : dict.Metadata.detailNotFoundTitle;

  const description = listing
    ? listing.description?.trim().slice(0, 160) || dict.Metadata.detailDescription
    : dict.PropertyDetail.states.notFoundDescription;

  const ogImages = listing?.images?.[0]?.url
    ? [
        {
          url: listing.images[0].url,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ]
    : undefined;

  return {
    ...(siteBaseUrl ? { metadataBase: siteBaseUrl } : {}),
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        vi: viPath,
        en: enPath,
        'x-default': viPath,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: 'Batdongsan',
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      alternateLocale: locale === 'en' ? ['vi_VN'] : ['en_US'],
      type: 'article',
      ...(ogImages ? { images: ogImages } : {}),
    },
  };
}
