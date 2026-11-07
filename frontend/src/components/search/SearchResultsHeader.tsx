'use client';

import React from 'react';
import { PublicListingsQuery } from '@/types';
import { useDictionary } from '@/i18n';
import { ActiveFilterTags } from './ActiveFilterTags';

interface SearchResultsHeaderProps {
  total: number;
  currentQuery: PublicListingsQuery;
}

export function SearchResultsHeader({
  total,
  currentQuery,
}: SearchResultsHeaderProps) {
  const dict = useDictionary();

  const countText = dict.SearchResults.results.count.replace(
    '{total}',
    String(total),
  );

  return (
    <div className="mb-5 pb-3 border-b border-[#E2E8F0]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Heading & Count Badge */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#142B4A]">
              {dict.SearchResults.results.heading}
            </h2>
            <span
              data-testid="search-results-count"
              className="text-xs bg-[#F1F5F9] text-[#475569] font-semibold px-2.5 py-0.5 rounded-full border border-[#CBD5E1]"
            >
              {countText}
            </span>
          </div>
        </div>

        {/* Right: Sort & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span>{dict.SearchResults.results.sortBy}</span>
            <span className="font-semibold text-[#142B4A] bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 shadow-2xs">
              {dict.SearchResults.results.sortNewest}
            </span>
          </div>

          <div className="flex items-center border border-[#CBD5E1] rounded-lg p-0.5 bg-white shadow-2xs">
            <button
              type="button"
              aria-label={dict.SearchResults.results.viewList}
              className="bg-[#0F766E] text-white p-1 rounded-md flex items-center justify-center cursor-default"
            >
              <span className="material-symbols-outlined text-lg leading-none">
                view_list
              </span>
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label={dict.SearchResults.results.viewMap}
              title={dict.SearchResults.results.viewMap}
              className="text-[#94A3B8] p-1 rounded-md flex items-center justify-center cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg leading-none">
                map
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterTags query={currentQuery} />
    </div>
  );
}
