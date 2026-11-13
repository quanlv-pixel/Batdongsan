import React, { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import QuanTriRedirectClient from './QuanTriRedirectClient';

interface QuanTriPageProps {
  params: Promise<{ locale: string }>;
}

export default async function QuanTriPage({ params }: QuanTriPageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <QuanTriRedirectClient locale={locale} />
    </Suspense>
  );
}
