'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useDictionary, useLocalizedHref } from '@/i18n';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ListingDetailError({ error, reset }: ErrorProps) {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  useEffect(() => {
    // Log error to console without exposing internal details on UI
    console.error('[ListingDetailError]', error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen justify-between bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb back to search */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-8"
          >
            <Link
              href={localizeHref('/')}
              className="hover:text-[#0F766E] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">home</span>
              <span>{dict.PropertyDetail.breadcrumb.home}</span>
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={localizeHref('/bat-dong-san')}
              className="hover:text-[#0F766E] transition-colors"
            >
              {dict.SearchResults.breadcrumb.searchResults}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-rose-600 font-medium">500</span>
          </nav>

          {/* Error Card */}
          <div
            data-testid="detail-error-container"
            className="bg-white p-8 sm:p-12 rounded-2xl border border-rose-200 text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">
                cloud_off
              </span>
            </div>
            <h1
              data-testid="detail-error-title"
              className="text-2xl font-bold text-[#142B4A] mb-3"
            >
              {dict.SearchResults?.states?.errorTitle || 'Lỗi kết nối máy chủ'}
            </h1>
            <p
              data-testid="detail-error-description"
              className="text-slate-600 text-sm max-w-md mx-auto mb-8 leading-relaxed"
            >
              {dict.SearchResults?.states?.errorDescription ||
                'Không thể tải chi tiết bất động sản do sự cố mạng hoặc máy chủ. Vui lòng thử lại.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                data-testid="detail-error-retry-btn"
                onClick={() => reset()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D655E] transition-colors shadow-sm cursor-pointer"
              >
                {dict.SearchResults?.states?.retryButton || 'Thử lại'}
              </button>
              <Link
                href={localizeHref('/bat-dong-san')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                {dict.PropertyDetail.states.backToSearch}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
