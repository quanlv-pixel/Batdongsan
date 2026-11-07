'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/i18n';

interface SearchErrorStateProps {
  message?: string | null;
}

export function SearchErrorState({ message }: SearchErrorStateProps) {
  const router = useRouter();
  const dict = useDictionary();

  const handleRetry = () => {
    router.refresh();
  };

  return (
    <div
      data-testid="search-error-state"
      className="bg-white rounded-lg border border-red-200 p-8 text-center flex flex-col items-center justify-center my-6 shadow-sm"
    >
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
        <span className="material-symbols-outlined text-3xl">error_outline</span>
      </div>
      <h3 className="text-base font-bold text-[#142B4A] mb-1.5">
        {dict.SearchResults.states.errorTitle}
      </h3>
      <p className="text-xs text-red-600 max-w-md mb-5 leading-relaxed">
        {message || dict.SearchResults.states.errorDescription}
      </p>
      <button
        type="button"
        onClick={handleRetry}
        className="bg-[#0F766E] hover:bg-[#0D655E] text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
      >
        {dict.SearchResults.states.retryButton}
      </button>
    </div>
  );
}
