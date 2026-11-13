import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/routing';
import WorkspacePageClient from './WorkspacePageClient';

export const instant = false;

interface WorkspacePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const isVi = locale === 'vi';
  return {
    title: isVi ? 'Khu vực quản lý | Batdongsan' : 'Workspace | Batdongsan',
    description: isVi
      ? 'Trung tâm quản trị tin đăng và phân phối bất động sản dành cho Chủ nhà và Đại lý.'
      : 'Management workspace for property owners and real estate agents.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkspacePageClient locale={locale} />
    </Suspense>
  );
}
