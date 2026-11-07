'use client';

import React from 'react';

export function SearchSkeletonList() {
  return (
    <div
      data-testid="search-skeleton-list"
      className="space-y-4 animate-pulse"
      aria-busy="true"
    >
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg border border-[#E2E8F0] p-0 flex flex-col sm:flex-row overflow-hidden shadow-2xs"
        >
          {/* Skeleton Media */}
          <div className="w-full sm:w-[280px] h-56 sm:h-[210px] bg-slate-200 flex-shrink-0" />

          {/* Skeleton Content */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="flex gap-2">
                <div className="h-4 bg-slate-100 rounded w-16" />
                <div className="h-4 bg-slate-100 rounded w-20" />
                <div className="h-4 bg-slate-100 rounded w-24" />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
