'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User, WorkspaceTabKey } from '@/types';
import MyListingsTab from './MyListingsTab';
import AssignedLeadsTab from './AssignedLeadsTab';
import MlsTab from './MlsTab';
import InquiriesTab from './InquiriesTab';

interface WorkspaceLayoutProps {
  user: User;
  locale: string;
}

interface TabConfig {
  key: WorkspaceTabKey;
  label: string;
  allowedRoles: string[];
  icon: (active: boolean) => React.ReactNode;
}

export function WorkspaceLayout({ user, locale }: WorkspaceLayoutProps) {
  const t = useTranslations('Workspace');
  const router = useRouter();
  const searchParams = useSearchParams();

  const allTabs: TabConfig[] = useMemo(() => [
    {
      key: 'my-listings',
      label: t('tabs.myListings'),
      allowedRoles: ['OWNER', 'AGENT', 'ADMIN'],
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 mr-2 ${active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      key: 'leads',
      label: t('tabs.leads'),
      allowedRoles: ['AGENT', 'ADMIN'],
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 mr-2 ${active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: 'mls',
      label: t('tabs.mls'),
      allowedRoles: ['AGENT', 'ADMIN'],
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 mr-2 ${active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
    {
      key: 'inquiries',
      label: t('tabs.inquiries'),
      allowedRoles: ['OWNER', 'AGENT', 'ADMIN'],
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 mr-2 ${active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ], [t]);

  // Filter tabs accessible to the user's role
  const availableTabs = useMemo(() => {
    return allTabs.filter((tab) => tab.allowedRoles.includes(user.role));
  }, [allTabs, user.role]);

  // Determine active tab
  const tabParam = searchParams.get('tab') as WorkspaceTabKey | null;
  const activeTab: WorkspaceTabKey = useMemo(() => {
    if (tabParam && availableTabs.some((t) => t.key === tabParam)) {
      return tabParam;
    }
    return availableTabs[0]?.key || 'my-listings';
  }, [tabParam, availableTabs]);

  const handleTabChange = (key: WorkspaceTabKey) => {
    router.replace(`/${locale}/quan-ly?tab=${key}`, { scroll: false });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {locale === 'vi' ? 'Chủ bất động sản (OWNER)' : 'Property Owner (OWNER)'}
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {locale === 'vi' ? 'Đại lý / Môi giới (AGENT)' : 'Real Estate Agent (AGENT)'}
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            {locale === 'vi' ? 'Quản trị viên (ADMIN)' : 'Administrator (ADMIN)'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-neutral-500">
          <Link href={`/${locale}`} className="hover:text-primary-600 transition-colors">
            {t('breadcrumbHome')}
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="font-medium text-neutral-800">{t('breadcrumbWorkspace')}</span>
        </nav>

        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">{t('title')}</h1>
              {getRoleBadge(user.role)}
            </div>
            <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <div className="font-bold text-neutral-800">{user.fullName}</div>
              <div className="text-neutral-500">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-neutral-200 bg-white rounded-xl shadow-sm px-4 pt-2">
          <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {availableTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-testid={`tab-${tab.key}`}
                  onClick={() => handleTabChange(tab.key)}
                  className={`group inline-flex items-center py-4 px-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                    active
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {tab.icon(active)}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panel */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          {activeTab === 'my-listings' && (
            <MyListingsTab userRole={user.role} locale={locale} />
          )}
          {activeTab === 'leads' && <AssignedLeadsTab locale={locale} />}
          {activeTab === 'mls' && <MlsTab locale={locale} />}
          {activeTab === 'inquiries' && <InquiriesTab locale={locale} />}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceLayout;

