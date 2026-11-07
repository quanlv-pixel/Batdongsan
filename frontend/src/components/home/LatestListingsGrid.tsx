'use client';

import React from 'react';
import Link from 'next/link';
import { PublicListingSummary } from '@/types';
import { ListingCard } from './ListingCard';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface LatestListingsGridProps {
  listings: PublicListingSummary[];
  isLoading?: boolean;
  error?: string | null;
}

export function LatestListingsGrid({
  listings,
  isLoading = false,
  error = null,
}: LatestListingsGridProps) {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  return (
    <section
      aria-labelledby="latest-listings-heading"
      className="py-12 lg:py-16 bg-[#F1F5F9] border-y border-[#E2E8F0]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
              <span className="text-xs font-semibold tracking-wider text-[#0F766E] uppercase">
                {dict.LatestListings.verifiedBadge}
              </span>
            </div>
            <h2
              id="latest-listings-heading"
              className="text-2xl font-bold text-[#142B4A]"
            >
              {dict.LatestListings.heading}
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              {dict.LatestListings.subtitle}
            </p>
          </div>

          <Link
            href={localizeHref('/bat-dong-san')}
            className="mt-4 md:mt-0 text-sm font-semibold text-[#0F766E] hover:underline flex items-center gap-1 group w-fit"
          >
            <span>{dict.LatestListings.viewAll}</span>
            <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* 1. Loading Skeleton State */}
        {isLoading && (
          <div
            data-testid="listings-loading-skeleton"
            aria-busy="true"
            aria-label={dict.LatestListings.loadingAriaLabel}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-sm animate-pulse"
              >
                <div className="w-full h-56 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-8 bg-slate-100 rounded w-full mt-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {!isLoading && error && (
          <div
            role="alert"
            className="bg-white rounded-lg border border-red-200 p-8 text-center max-w-2xl mx-auto shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">
                error_outline
              </span>
            </div>
            <h3 className="text-base font-bold text-[#142B4A] mb-1">
              {dict.LatestListings.errorHeading}
            </h3>
            <p className="text-sm text-[#475569]">{error}</p>
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !error && listings.length === 0 && (
          <div
            data-testid="listings-empty-state"
            className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center max-w-2xl mx-auto shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">domain</span>
            </div>
            <h3 className="text-base font-bold text-[#142B4A] mb-1">
              {dict.LatestListings.emptyHeading}
            </h3>
            <p className="text-sm text-[#475569]">
              {dict.LatestListings.emptyDescription}
            </p>
          </div>
        )}

        {/* 4. Populated Listings Grid */}
        {!isLoading && !error && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                priority={index < 3}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
