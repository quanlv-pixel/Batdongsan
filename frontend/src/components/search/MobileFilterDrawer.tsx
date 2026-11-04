'use client';

import React, { useState } from 'react';
import { PublicListingsQuery } from '@/types';
import { useDictionary } from '@/i18n';
import { SearchFilterSidebar } from './SearchFilterSidebar';

interface MobileFilterDrawerProps {
  currentQuery: PublicListingsQuery;
}

export function MobileFilterDrawer({ currentQuery }: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dict = useDictionary();

  // Count active filters (excluding page and limit)
  const activeCount = Object.entries(currentQuery).filter(
    ([key, val]) =>
      key !== 'page' &&
      key !== 'limit' &&
      val !== undefined &&
      val !== '' &&
      val !== 'ALL',
  ).length;

  return (
    <div className="lg:hidden mb-4">
      {/* Mobile Trigger Button */}
      <button
        type="button"
        data-testid="mobile-filter-open-button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-white border border-[#CBD5E1] rounded-lg py-2.5 px-4 text-sm font-semibold text-[#142B4A] hover:border-[#0F766E] shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <span className="material-symbols-outlined text-lg text-[#0F766E]">
          tune
        </span>
        <span>
          {activeCount > 0
            ? dict.SearchResults.mobile.filtersCount.replace(
                '{count}',
                String(activeCount),
              )
            : dict.SearchResults.mobile.openFilters}
        </span>
      </button>

      {/* Slide-over Backdrop & Drawer */}
      {isOpen && (
        <div
          data-testid="mobile-filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={dict.SearchResults.mobile.title}
          className="fixed inset-0 z-50 overflow-hidden"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0F766E] text-xl">
                    tune
                  </span>
                  <h3 className="font-bold text-base text-[#142B4A]">
                    {dict.SearchResults.mobile.title}
                  </h3>
                </div>
                <button
                  type="button"
                  data-testid="mobile-filter-close-button"
                  aria-label={dict.SearchResults.mobile.close}
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-2xl">
                    close
                  </span>
                </button>
              </div>

              {/* Drawer Body (Scrollable Sidebar Content) */}
              <div className="flex-1 overflow-y-auto p-4">
                <SearchFilterSidebar
                  key={JSON.stringify(currentQuery)}
                  currentQuery={currentQuery}
                  onApply={() => setIsOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
