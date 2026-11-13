'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';

interface AdminPageClientProps {
  locale: string;
}

export default function AdminPageClient({ locale }: AdminPageClientProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('AdminPortal');

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
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Redirects via useEffect
  }

  // Non-ADMIN role restriction: 403 Access Denied
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div
          data-testid="admin-access-denied"
          className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('accessDeniedTitle')}</h2>
          <p className="text-xs text-neutral-600 mb-6">{t('accessDeniedDescription')}</p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors w-full"
          >
            {t('accessDeniedBackHome')}
          </Link>
        </div>
      </div>
    );
  }

  return <AdminLayout user={user} locale={locale} />;
}
