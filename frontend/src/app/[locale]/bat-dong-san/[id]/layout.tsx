import React from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { fetchPublicListingDetail } from '@/lib/public-listings';
import {
  buildLocalizedListingDetailMetadata,
  getSiteBaseUrl,
  resolveMetadataUrl,
} from '@/i18n/metadata';
import { getDictionary } from '@/i18n/dictionaries';
import { resolveLocale } from '@/i18n/routing';

interface ListingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  try {
    const listing = await fetchPublicListingDetail(id);
    return buildLocalizedListingDetailMetadata(locale, id, listing);
  } catch {
    // In case of backend network failure or 5xx outage, do NOT misreport as not-found.
    // Provide generic localized Batdongsan fallback metadata.
    const dict = getDictionary(locale);
    const siteBaseUrl = getSiteBaseUrl();
    const suffix = `/bat-dong-san/${id}`;
    const canonicalPath = resolveMetadataUrl(`/${locale}${suffix}`, siteBaseUrl);
    return {
      ...(siteBaseUrl ? { metadataBase: siteBaseUrl } : {}),
      title: `${dict.Navbar.brandName} - Batdongsan`,
      description: dict.Metadata.detailDescription,
      alternates: {
        canonical: canonicalPath,
        languages: {
          vi: resolveMetadataUrl(`/vi${suffix}`, siteBaseUrl),
          en: resolveMetadataUrl(`/en${suffix}`, siteBaseUrl),
          'x-default': resolveMetadataUrl(`/vi${suffix}`, siteBaseUrl),
        },
      },
    };
  }
}

export default async function ListingDetailLayout({
  children,
  params,
}: ListingLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  return children;
}
