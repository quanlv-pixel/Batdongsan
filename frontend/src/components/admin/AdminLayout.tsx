'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User, AdminTabKey } from '@/types';
import ModerationTab from './ModerationTab';
import AdminRequestsTab from './AdminRequestsTab';
import UsersManagementTab from './UsersManagementTab';
import AdminMlsTab from './AdminMlsTab';

interface AdminLayoutProps {
  user: User;
  locale: string;
}

interface AdminTabConfig {
  key: AdminTabKey;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

export function AdminLayout({ user, locale }: AdminLayoutProps) {
  const t = useTranslations('AdminPortal');
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs: AdminTabConfig[] = useMemo(
    () => [
      {
        key: 'moderation',
        label: t('tabs.moderation'),
        icon: (active: boolean) => (
          <svg
            className={`w-5 h-5 mr-2 ${active ? 'text-purple-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        key: 'requests',
        label: t('tabs.requests'),
        icon: (active: boolean) => (
          <svg
            className={`w-5 h-5 mr-2 ${active ? 'text-purple-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
      {
        key: 'users',
        label: t('tabs.users'),
        icon: (active: boolean) => (
          <svg
            className={`w-5 h-5 mr-2 ${active ? 'text-purple-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        key: 'mls',
        label: t('tabs.mls'),
        icon: (active: boolean) => (
          <svg
            className={`w-5 h-5 mr-2 ${active ? 'text-purple-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        ),
      },
    ],
    [t],
  );

  const tabParam = searchParams.get('tab') as AdminTabKey | null;
  const activeTab: AdminTabKey = useMemo(() => {
    if (tabParam && tabs.some((t) => t.key === tabParam)) {
      return tabParam;
    }
    return 'moderation';
  }, [tabParam, tabs]);

  const handleTabChange = (key: AdminTabKey) => {
    router.replace(`/${locale}/admin?tab=${key}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8" data-testid="admin-layout">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-neutral-500" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="hover:text-neutral-700 transition-colors">
            {t('breadcrumbHome')}
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="font-semibold text-purple-700">{t('breadcrumbAdmin')}</span>
        </nav>

        {/* Portal Header */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {t('title')}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-neutral-500">{t('subtitle')}</p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right">
              <p className="text-xs font-bold text-neutral-900">{user.fullName}</p>
              <p className="text-[11px] text-neutral-500">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="border-b border-neutral-200 bg-white rounded-xl shadow-sm px-4">
          <div className="flex space-x-2 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-testid={`tab-${tab.key}`}
                  onClick={() => handleTabChange(tab.key)}
                  className={`group inline-flex items-center py-2.5 px-4 font-semibold text-xs rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-200'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  {tab.icon(isActive)}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Content */}
        <div className="mt-6">
          {activeTab === 'moderation' && <ModerationTab locale={locale} />}
          {activeTab === 'requests' && <AdminRequestsTab locale={locale} />}
          {activeTab === 'users' && <UsersManagementTab locale={locale} currentAdminId={user.id} />}
          {activeTab === 'mls' && <AdminMlsTab locale={locale} />}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
