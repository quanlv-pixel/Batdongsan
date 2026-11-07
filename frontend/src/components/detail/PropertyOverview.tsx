'use client';

import React, { useState } from 'react';
import { PublicListingSummary } from '@/types';
import { AppLocale } from '@/i18n/routing';
import { useDictionary } from '@/i18n';
import {
  formatArea,
  formatListingDate,
  formatPricePerSqm,
  formatVndPrice,
  formatAdministrativeLocation,
  formatListingReferenceCode,
  getPropertyTypeLabel,
  getTransactionBadgeLabel,
} from '@/lib/formatters';

interface PropertyOverviewProps {
  listing: PublicListingSummary;
  locale: AppLocale;
}

export function PropertyOverview({ listing, locale }: PropertyOverviewProps) {
  const dict = useDictionary();
  const [copied, setCopied] = useState(false);

  const priceFormatted = formatVndPrice(listing.priceVnd, {
    transactionType: listing.transactionType,
    rentalPeriod: listing.rentalPeriod,
    locale,
  });

  const perSqmFormatted = formatPricePerSqm(
    listing.priceVnd,
    listing.areaSqm,
    listing.transactionType,
    locale,
  );

  const areaFormatted = formatArea(listing.areaSqm, locale);
  const locationFormatted = formatAdministrativeLocation(listing);
  const propertyTypeLabel = getPropertyTypeLabel(listing.propertyType, locale);
  const transactionBadgeLabel = getTransactionBadgeLabel(
    listing.transactionType,
    listing.propertyType,
    locale,
  );
  const updatedDateFormatted = formatListingDate(
    listing.updatedAt || listing.createdAt,
    locale,
  );

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore clipboard error
    }
  };

  const listingCode = formatListingReferenceCode(listing.id);

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
      {/* Badges & Actions row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="detail-transaction-badge"
            className="px-3 py-1 rounded-full bg-slate-100 text-[#142B4A] text-xs font-semibold"
          >
            {transactionBadgeLabel}
          </span>
          <span className="px-3 py-1 rounded-full bg-teal-50 text-[#0F766E] border border-teal-100 text-xs font-semibold">
            {dict.PropertyDetail.badges.approved}
          </span>
          <span className="text-xs text-slate-500 font-medium ml-1">
            {dict.PropertyDetail.badges.listingCode}{' '}
            <strong
              data-testid="detail-listing-code"
              className="text-[#142B4A] font-mono"
            >
              {listingCode}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button (Upcoming / Roadmap feature) */}
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium cursor-not-allowed opacity-80"
            title={dict.PropertyDetail.actions.saveUpcomingNotice}
            aria-disabled="true"
          >
            <span className="material-symbols-outlined text-base">
              favorite_border
            </span>
            <span>
              {dict.PropertyDetail.actions.save} ({dict.PropertyDetail.actions.comingSoon})
            </span>
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:border-[#0F766E] hover:text-[#0F766E] transition-colors relative"
            aria-label={dict.PropertyDetail.actions.share}
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>
              {copied
                ? dict.PropertyDetail.actions.copied
                : dict.PropertyDetail.actions.share}
            </span>
          </button>
        </div>
      </div>

      {/* H1 Property Title */}
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] mb-3 leading-snug">
        {listing.title}
      </h1>

      {/* Geographic Location (Administrative Ward / District / Province only) */}
      <div className="flex items-center gap-1.5 text-slate-600 text-sm mb-5">
        <span className="material-symbols-outlined text-[#0F766E] text-lg shrink-0">
          location_on
        </span>
        <span className="truncate">{locationFormatted}</span>
      </div>

      {/* Price & Rate Display */}
      <div className="flex flex-wrap items-baseline gap-3 pb-6 border-b border-slate-100">
        <span
          data-testid="detail-price-vnd"
          className="font-display text-3xl font-bold text-[#0F766E]"
        >
          {priceFormatted}
        </span>
        {perSqmFormatted && (
          <span
            data-testid="detail-price-per-m2"
            className="px-2.5 py-1 rounded-full bg-slate-50 text-xs font-medium text-slate-700 border border-slate-200"
          >
            {perSqmFormatted}
          </span>
        )}
        <span className="text-xs text-slate-400 italic sm:ml-auto">
          {dict.PropertyDetail.overview.priceNegotiable}
        </span>
      </div>

      {/* 4 Core Parameter Badges (Preserving Data Truthfulness) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6">
        {/* 1. Diện tích */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0F766E] shadow-xs shrink-0">
            <span className="material-symbols-outlined">square_foot</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium truncate">
              {dict.PropertyDetail.overview.area}
            </p>
            <p className="text-sm sm:text-base font-bold text-[#142B4A] truncate">
              {areaFormatted}
            </p>
          </div>
        </div>

        {/* 2. Loại hình */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0F766E] shadow-xs shrink-0">
            <span className="material-symbols-outlined">apartment</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium truncate">
              {dict.PropertyDetail.overview.propertyType}
            </p>
            <p className="text-sm sm:text-base font-bold text-[#142B4A] truncate">
              {propertyTypeLabel}
            </p>
          </div>
        </div>

        {/* 3. Hình thức giao dịch */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0F766E] shadow-xs shrink-0">
            <span className="material-symbols-outlined">real_estate_agent</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium truncate">
              {dict.PropertyDetail.overview.transactionType}
            </p>
            <p className="text-sm sm:text-base font-bold text-[#142B4A] truncate">
              {listing.transactionType === 'FOR_SALE'
                ? dict.Navbar.forSale
                : dict.Navbar.forRent}
            </p>
          </div>
        </div>

        {/* 4. Cập nhật */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0F766E] shadow-xs shrink-0">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium truncate">
              {dict.PropertyDetail.overview.updatedAt}
            </p>
            <p className="text-sm sm:text-base font-bold text-[#142B4A] truncate">
              {updatedDateFormatted}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
