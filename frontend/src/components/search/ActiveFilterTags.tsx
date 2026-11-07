'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PublicListingsQuery } from '@/types';
import {
  buildListingsSearchParams,
  formatArea,
  formatVndPrice,
  getPropertyTypeLabel,
} from '@/lib/formatters';
import { useAppLocale, useDictionary, useLocalizedHref } from '@/i18n';

interface ActiveFilterTagsProps {
  query: PublicListingsQuery;
}

export function ActiveFilterTags({ query }: ActiveFilterTagsProps) {
  const router = useRouter();
  const locale = useAppLocale();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const handleRemoveFilter = (filterKey: keyof PublicListingsQuery) => {
    const nextQuery: PublicListingsQuery = { ...query, page: 1 };
    delete nextQuery[filterKey];
    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    router.push(
      localizeHref(`/bat-dong-san${queryString ? `?${queryString}` : ''}`),
    );
  };

  const handleRemovePriceRange = () => {
    const nextQuery: PublicListingsQuery = { ...query, page: 1 };
    delete nextQuery.minPrice;
    delete nextQuery.maxPrice;
    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    router.push(
      localizeHref(`/bat-dong-san${queryString ? `?${queryString}` : ''}`),
    );
  };

  const handleRemoveAreaRange = () => {
    const nextQuery: PublicListingsQuery = { ...query, page: 1 };
    delete nextQuery.minArea;
    delete nextQuery.maxArea;
    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    router.push(
      localizeHref(`/bat-dong-san${queryString ? `?${queryString}` : ''}`),
    );
  };

  const handleClearAll = () => {
    router.push(localizeHref('/bat-dong-san'));
  };

  const tags: Array<{
    id: string;
    label: string;
    onRemove: () => void;
  }> = [];

  // Transaction type tag
  if (query.transactionType) {
    const txLabel =
      query.transactionType === 'FOR_SALE'
        ? dict.SearchResults.filterSidebar.transactionType.forSale
        : dict.SearchResults.filterSidebar.transactionType.forRent;
    tags.push({
      id: 'txType',
      label: `${dict.SearchResults.results.filterTagPrefix.transactionType} ${txLabel}`,
      onRemove: () => handleRemoveFilter('transactionType'),
    });
  }

  // Location tags
  if (query.province) {
    tags.push({
      id: 'province',
      label: `${dict.SearchResults.results.filterTagPrefix.province} ${query.province}`,
      onRemove: () => handleRemoveFilter('province'),
    });
  }
  if (query.district) {
    tags.push({
      id: 'district',
      label: `${dict.SearchResults.results.filterTagPrefix.district} ${query.district}`,
      onRemove: () => handleRemoveFilter('district'),
    });
  }
  if (query.ward) {
    tags.push({
      id: 'ward',
      label: `${dict.SearchResults.results.filterTagPrefix.ward} ${query.ward}`,
      onRemove: () => handleRemoveFilter('ward'),
    });
  }

  // Property type tag
  if (query.propertyType) {
    tags.push({
      id: 'propType',
      label: `${dict.SearchResults.results.filterTagPrefix.propertyType} ${getPropertyTypeLabel(query.propertyType, locale)}`,
      onRemove: () => handleRemoveFilter('propertyType'),
    });
  }

  // Price range tag
  if (query.minPrice || query.maxPrice) {
    let priceLabel = '';
    if (query.minPrice && query.maxPrice) {
      priceLabel = `${formatVndPrice(query.minPrice, { locale })} - ${formatVndPrice(query.maxPrice, { locale })}`;
    } else if (query.minPrice) {
      priceLabel = `≥ ${formatVndPrice(query.minPrice, { locale })}`;
    } else if (query.maxPrice) {
      priceLabel = `≤ ${formatVndPrice(query.maxPrice, { locale })}`;
    }
    tags.push({
      id: 'price',
      label: `${dict.SearchResults.results.filterTagPrefix.price} ${priceLabel}`,
      onRemove: handleRemovePriceRange,
    });
  }

  // Area range tag
  if (query.minArea !== undefined || query.maxArea !== undefined) {
    let areaLabel = '';
    if (query.minArea !== undefined && query.maxArea !== undefined) {
      areaLabel = `${formatArea(query.minArea, locale)} - ${formatArea(query.maxArea, locale)}`;
    } else if (query.minArea !== undefined) {
      areaLabel = `≥ ${formatArea(query.minArea, locale)}`;
    } else if (query.maxArea !== undefined) {
      areaLabel = `≤ ${formatArea(query.maxArea, locale)}`;
    }
    tags.push({
      id: 'area',
      label: `${dict.SearchResults.results.filterTagPrefix.area} ${areaLabel}`,
      onRemove: handleRemoveAreaRange,
    });
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="active-filter-tags"
      className="flex items-center gap-1.5 mt-2 flex-wrap"
    >
      <span className="text-xs text-[#64748B] font-medium mr-1">
        {dict.SearchResults.results.activeFiltersLabel}
      </span>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-medium"
        >
          <span>{tag.label}</span>
          <button
            type="button"
            aria-label={`Remove filter ${tag.label}`}
            onClick={tag.onRemove}
            className="hover:text-teal-950 font-bold ml-0.5 leading-none focus:outline-none"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={handleClearAll}
        className="text-xs text-[#0F766E] font-medium underline ml-1 hover:text-teal-900 focus:outline-none cursor-pointer"
      >
        {dict.SearchResults.results.clearAllTags}
      </button>
    </div>
  );
}
