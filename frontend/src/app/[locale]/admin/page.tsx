import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import AdminPageClient from './AdminPageClient';

export const instant = false;

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: AdminPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const isVi = locale === 'vi';
  return {
    title: isVi ? 'Cổng Quản Trị Hệ Thống | Batdongsan' : 'Admin Portal | Batdongsan',
    description: isVi
      ? 'Trung tâm kiểm duyệt tin đăng, điều phối yêu cầu liên hệ và quản trị hệ thống Batdongsan.'
      : 'Administrative portal for listing moderation, contact requests dispatch, and system management.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminPage({ params }: AdminPageProps) {
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
      <AdminPageClient locale={locale} />
    </Suspense>
  );
}
