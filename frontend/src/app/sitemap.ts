import type { MetadataRoute } from 'next';
import { getSiteBaseUrl, resolveMetadataUrl } from '@/i18n/metadata';

const PUBLIC_LOCALIZED_ROUTES: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly';
  priority: number;
}> = [
  { path: '/vi', changeFrequency: 'daily', priority: 1.0 },
  { path: '/en', changeFrequency: 'daily', priority: 0.9 },
  { path: '/vi/bat-dong-san', changeFrequency: 'daily', priority: 0.9 },
  { path: '/en/bat-dong-san', changeFrequency: 'daily', priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteBaseUrl();
  if (!baseUrl) {
    return [];
  }

  return PUBLIC_LOCALIZED_ROUTES.map((route) => ({
    url: resolveMetadataUrl(route.path, baseUrl),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
