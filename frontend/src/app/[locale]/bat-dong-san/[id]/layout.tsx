import React from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { fetchPublicListingDetail } from '@/lib/public-listings';
import { buildLocalizedListingDetailMetadata } from '@/i18n/metadata';
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
  const listing = await fetchPublicListingDetail(id).catch(() => null);
  return buildLocalizedListingDetailMetadata(locale, id, listing);
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
