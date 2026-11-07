import React from 'react';
import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppLocaleProvider } from '@/i18n';
import { getDictionary } from '@/i18n/dictionaries';
import { buildLocalizedPageMetadata } from '@/i18n/metadata';
import { isValidLocale, routing } from '@/i18n/routing';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildLocalizedPageMetadata(locale, '/');
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = getDictionary(locale);

  return (
    <html lang={locale} className={beVietnamPro.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#142B4A] min-h-screen flex flex-col justify-between">
        <AppLocaleProvider locale={locale} messages={messages} prefixEnabled={true}>
          <AuthProvider>{children}</AuthProvider>
        </AppLocaleProvider>
      </body>
    </html>
  );
}
