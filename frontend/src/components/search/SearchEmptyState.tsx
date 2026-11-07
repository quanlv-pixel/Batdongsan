'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary, useLocalizedHref } from '@/i18n';

export function SearchEmptyState() {
  const router = useRouter();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const handleClear = () => {
    router.push(localizeHref('/bat-dong-san'));
  };

  return (
    <div
      data-testid="search-empty-state"
      className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center flex flex-col items-center justify-center my-6 shadow-sm"
    >
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#94A3B8] mb-4">
        <span className="material-symbols-outlined text-3xl">search_off</span>
      </div>
      <h3 className="text-lg font-bold text-[#142B4A] mb-2">
        {dict.SearchResults.states.emptyTitle}
      </h3>
      <p className="text-sm text-[#64748B] max-w-md mb-6 leading-relaxed">
        {dict.SearchResults.states.emptyDescription}
      </p>
      <button
        type="button"
        onClick={handleClear}
        className="bg-[#0F766E] hover:bg-[#0D655E] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
      >
        {dict.SearchResults.states.clearFiltersAction}
      </button>
    </div>
  );
}
