import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildLocalizedPageMetadata } from '@/i18n/metadata';

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildLocalizedPageMetadata(locale, '/register');
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
