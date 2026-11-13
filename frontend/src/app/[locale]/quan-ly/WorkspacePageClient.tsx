'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';

interface WorkspacePageClientProps {
  locale: string;
}

export default function WorkspacePageClient({ locale }: WorkspacePageClientProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('Workspace');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      router.replace(`/${locale}/login?returnTo=${encodeURIComponent(currentUrl)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname, searchParams, locale]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect in useEffect
  }

  if (user.role === 'BUYER') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div
          data-testid="buyer-access-notice"
          className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('roleBuyerNoticeTitle')}</h2>
          <p className="text-sm text-neutral-600 mb-6">{t('roleBuyerNoticeDescription')}</p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors w-full"
          >
            {t('roleBuyerBackHome')}
          </Link>
        </div>
      </div>
    );
  }

  return <WorkspaceLayout user={user} locale={locale} />;
}
