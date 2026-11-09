'use client';

import React from 'react';
import { PublicListingSummary } from '@/types';
import { AppLocale } from '@/i18n/routing';
import { useDictionary } from '@/i18n';
import {
  formatArea,
  formatListingDate,
  formatPricePerSqm,
  formatVndPrice,
  getPropertyTypeLabel,
} from '@/lib/formatters';

interface PropertySpecsTableProps {
  listing: PublicListingSummary;
  locale: AppLocale;
}

export function PropertySpecsTable({ listing, locale }: PropertySpecsTableProps) {
  const dict = useDictionary();

  const propertyTypeLabel = getPropertyTypeLabel(listing.propertyType, locale);
  const transactionTypeLabel =
    listing.transactionType === 'FOR_SALE'
      ? dict.Navbar.forSale
      : dict.Navbar.forRent;
  const areaFormatted = formatArea(listing.areaSqm, locale);
  const priceFormatted = formatVndPrice(listing.priceVnd, {
    transactionType: listing.transactionType,
    rentalPeriod: listing.rentalPeriod,
    locale,
  });
  const pricePerSqm = formatPricePerSqm(
    listing.priceVnd,
    listing.areaSqm,
    listing.transactionType,
    locale,
  );
  const postedDate = formatListingDate(listing.createdAt, locale);
  const updatedDate = formatListingDate(listing.updatedAt, locale);

  const specs = [
    {
      label: dict.PropertyDetail.specs.propertyType,
      value: propertyTypeLabel,
    },
    {
      label: dict.PropertyDetail.specs.transactionType,
      value: transactionTypeLabel,
    },
    {
      label: dict.PropertyDetail.specs.area,
      value: areaFormatted,
    },
    {
      label: dict.PropertyDetail.specs.price,
      value: priceFormatted,
    },
    {
      label: dict.PropertyDetail.specs.pricePerSqm,
      value: pricePerSqm || '—',
    },
    {
      label: dict.PropertyDetail.specs.province,
      value: listing.province || '—',
    },
    {
      label: dict.PropertyDetail.specs.district,
      value: listing.district || '—',
    },
    {
      label: dict.PropertyDetail.specs.ward,
      value: listing.ward || '—',
    },
    {
      label: dict.PropertyDetail.specs.status,
      value: dict.PropertyDetail.specs.statusApproved,
      highlight: true,
    },
    {
      label: dict.PropertyDetail.specs.postedDate,
      value: postedDate,
    },
    {
      label: dict.PropertyDetail.specs.lastUpdated,
      value: updatedDate,
    },
  ];

  return (
    <div
      data-testid="property-specs-table"
      className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm"
    >
      <h2 className="font-display text-xl font-bold text-[#142B4A] mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#0F766E]">
          table_chart
        </span>
        <span>{dict.PropertyDetail.specs.title}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
        {specs.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center py-2.5 border-b border-slate-100"
          >
            <span className="text-slate-500 font-medium">{item.label}</span>
            <span
              className={`font-semibold text-right ${
                item.highlight ? 'text-[#0F766E]' : 'text-[#142B4A]'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
