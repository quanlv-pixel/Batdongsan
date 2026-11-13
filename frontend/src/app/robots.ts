import type { MetadataRoute } from 'next';
import { getSiteBaseUrl, resolveMetadataUrl } from '@/i18n/metadata';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();
  const sitemapUrl = baseUrl
    ? resolveMetadataUrl('/sitemap.xml', baseUrl)
    : undefined;

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/vi', '/en', '/vi/bat-dong-san', '/en/bat-dong-san'],
        disallow: [
          '/admin',
          '/vi/admin',
          '/en/admin',
          '/quan-tri',
          '/vi/quan-tri',
          '/en/quan-tri',
          '/quan-ly',
          '/vi/quan-ly',
          '/en/quan-ly',
          '/workspace',
          '/vi/workspace',
          '/en/workspace',
          '/api/',
        ],
      },
    ],
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
