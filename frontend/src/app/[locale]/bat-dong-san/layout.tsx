import React from 'react';
import type { Metadata } from 'next';
import { buildLocalizedPageMetadata } from '@/i18n/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildLocalizedPageMetadata(locale, '/bat-dong-san');
}

export default function SearchResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
