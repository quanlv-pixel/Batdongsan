import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_LOCALE,
  isValidLocale,
  LOCALE_COOKIE_NAME,
  routing,
} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Exclude API routes, Next.js internals, and static files with extensions
  if (
    pathname.startsWith('/api/') ||
    pathname === '/api' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check if URL already has an explicit locale prefix (/vi or /en)
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  const hasExplicitLocalePrefix = isValidLocale(firstSegment);

  // Check if user has a saved locale cookie
  const savedCookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const hasValidCookieLocale = isValidLocale(savedCookieLocale);

  // Requirement: Vietnamese ('vi') must be the default for first-time visitors
  // visiting unprefixed legacy routes (/, /login, /register), regardless of browser Accept-Language.
  // If a user previously chose a locale (stored in NEXT_LOCALE cookie), preserve that choice.
  if (!hasExplicitLocalePrefix) {
    const targetLocale = hasValidCookieLocale
      ? savedCookieLocale
      : DEFAULT_LOCALE;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      pathname === '/' ? `/${targetLocale}` : `/${targetLocale}${pathname}`;

    const response = NextResponse.redirect(redirectUrl, 307);
    response.cookies.set(LOCALE_COOKIE_NAME, targetLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // For explicit locale routes (/vi/* or /en/*), delegate to next-intl middleware
  // and persist the active locale in NEXT_LOCALE cookie for subsequent navigation/refreshes.
  const response = handleI18nRouting(request);
  response.cookies.set(LOCALE_COOKIE_NAME, firstSegment, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
