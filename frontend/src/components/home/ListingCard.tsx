'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicListingSummary } from '@/types';
import {
  formatAdministrativeLocation,
  formatArea,
  formatListingDate,
  formatPricePerSqm,
  formatVndPrice,
  getPropertyTypeLabel,
  getTransactionBadgeLabel,
} from '@/lib/formatters';
import { useAppLocale, useDictionary, useLocalizedHref } from '@/i18n';

interface ListingCardProps {
  listing: PublicListingSummary;
  priority?: boolean;
}

export function ListingCard({ listing, priority = false }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);
  const locale = useAppLocale();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const sortedImages = Array.isArray(listing.images)
    ? [...listing.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const primaryImageUrl = sortedImages[0]?.url?.trim() || '';
  const hasValidImage = primaryImageUrl.length > 0 && !imageError;

  const formattedPrice = formatVndPrice(listing.priceVnd, {
    transactionType: listing.transactionType,
    rentalPeriod: listing.rentalPeriod,
    locale,
  });
  const formattedPricePerSqm = formatPricePerSqm(
    listing.priceVnd,
    listing.areaSqm,
    listing.transactionType,
    locale,
  );
  const formattedArea = formatArea(listing.areaSqm, locale);
  const propertyTypeLabel = getPropertyTypeLabel(listing.propertyType, locale);
  const transactionBadge = getTransactionBadgeLabel(
    listing.transactionType,
    listing.propertyType,
    locale,
  );
  const locationText = formatAdministrativeLocation({
    ward: listing.ward,
    district: listing.district,
    province: listing.province,
  });
  const formattedDate = formatListingDate(listing.createdAt, locale);
  const photosBadgeText = dict.LatestListings.photosCount.replace(
    '{count}',
    String(sortedImages.length),
  );

  return (
    <article className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group flex flex-col">
      {/* Media Region */}
      <div className="relative w-full h-56 overflow-hidden bg-[#F1F5F9]">
        {hasValidImage ? (
          <Image
            src={primaryImageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={priority ? 'eager' : 'lazy'}
            unoptimized
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            data-testid="listing-image-fallback"
            className="w-full h-full flex flex-col items-center justify-center text-[#64748B] bg-[#F1F5F9] gap-1.5"
          >
            <span className="material-symbols-outlined text-4xl text-[#94A3B8]">
              image_not_supported
            </span>
            <span className="text-xs font-medium">
              {dict.LatestListings.noImage}
            </span>
          </div>
        )}

        {/* Truthful Transaction & Property Type Badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-[#0F766E]/95 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {transactionBadge}
          </span>
        </div>

        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-[#142B4A]/75 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">
              photo_camera
            </span>
            <span>{photosBadgeText}</span>
          </div>
        )}
      </div>

      {/* Content Region */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Price & Price per sqm */}
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <span className="text-2xl font-bold text-[#0F766E]">
            {formattedPrice}
          </span>
          {formattedPricePerSqm && (
            <span className="text-xs font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
              {formattedPricePerSqm}
            </span>
          )}
        </div>

        {/* Title linking to detail route */}
        <h3 className="text-base font-semibold text-[#142B4A] line-clamp-2 group-hover:text-[#0F766E] transition-colors mb-3 leading-snug">
          <Link href={localizeHref(`/bat-dong-san/${listing.id}`)}>
            {listing.title}
          </Link>
        </h3>

        {/* Verified Specifications Only (Area & Property Type — no fabricated bedrooms/bathrooms) */}
        <div className="flex items-center gap-4 text-xs font-medium text-[#475569] py-2.5 border-y border-[#E2E8F0] mb-3">
          {formattedArea && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#0F766E]">
                square_foot
              </span>
              <span>{formattedArea}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#0F766E]">
              home_work
            </span>
            <span>{propertyTypeLabel}</span>
          </div>
        </div>

        {/* Administrative Location & Created Date */}
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[#475569]">
          <div className="flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-sm text-[#64748B]">
              location_on
            </span>
            <span className="truncate">{locationText}</span>
          </div>
          {formattedDate && (
            <span className="text-[11px] text-[#64748B] whitespace-nowrap">
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
