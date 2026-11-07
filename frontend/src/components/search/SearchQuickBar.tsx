'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyType, PublicListingsQuery } from '@/types';
import { buildListingsSearchParams } from '@/lib/formatters';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface SearchQuickBarProps {
  currentQuery: PublicListingsQuery;
}

export function SearchQuickBar({ currentQuery }: SearchQuickBarProps) {
  const router = useRouter();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const [province, setProvince] = useState<string>(
    currentQuery.province || '',
  );
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    currentQuery.propertyType || '',
  );
  const [priceRangeKey, setPriceRangeKey] = useState<string>(() => {
    if (currentQuery.minPrice && currentQuery.maxPrice) {
      return `${currentQuery.minPrice}-${currentQuery.maxPrice}`;
    }
    if (currentQuery.maxPrice) {
      return `0-${currentQuery.maxPrice}`;
    }
    if (currentQuery.minPrice) {
      return `${currentQuery.minPrice}+`;
    }
    return '';
  });
  const [areaRangeKey, setAreaRangeKey] = useState<string>(() => {
    if (currentQuery.minArea !== undefined && currentQuery.maxArea !== undefined) {
      return `${currentQuery.minArea}-${currentQuery.maxArea}`;
    }
    if (currentQuery.maxArea !== undefined) {
      return `0-${currentQuery.maxArea}`;
    }
    if (currentQuery.minArea !== undefined) {
      return `${currentQuery.minArea}+`;
    }
    return '';
  });

  const handleQuickSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let minPrice: string | undefined = undefined;
    let maxPrice: string | undefined = undefined;

    if (priceRangeKey === 'under-2b') {
      maxPrice = '2000000000';
    } else if (priceRangeKey === '2b-5b') {
      minPrice = '2000000000';
      maxPrice = '5000000000';
    } else if (priceRangeKey === '5b-10b') {
      minPrice = '5000000000';
      maxPrice = '10000000000';
    } else if (priceRangeKey === 'above-10b') {
      minPrice = '10000000000';
    } else if (priceRangeKey === 'under-10m') {
      maxPrice = '10000000';
    } else if (priceRangeKey === '10m-20m') {
      minPrice = '10000000';
      maxPrice = '20000000';
    } else if (priceRangeKey === '20m-50m') {
      minPrice = '20000000';
      maxPrice = '50000000';
    } else if (priceRangeKey === 'above-50m') {
      minPrice = '50000000';
    }

    let minArea: number | undefined = undefined;
    let maxArea: number | undefined = undefined;

    if (areaRangeKey === 'under-50') {
      maxArea = 50;
    } else if (areaRangeKey === '50-80') {
      minArea = 50;
      maxArea = 80;
    } else if (areaRangeKey === '80-120') {
      minArea = 80;
      maxArea = 120;
    } else if (areaRangeKey === '120-200') {
      minArea = 120;
      maxArea = 200;
    } else if (areaRangeKey === 'above-200') {
      minArea = 200;
    }

    const nextQuery: PublicListingsQuery = {
      ...currentQuery,
      page: 1,
      province: province.trim() || undefined,
      propertyType: propertyType || undefined,
      minPrice: minPrice ?? (priceRangeKey ? undefined : currentQuery.minPrice),
      maxPrice: maxPrice ?? (priceRangeKey ? undefined : currentQuery.maxPrice),
      minArea: minArea ?? (areaRangeKey ? undefined : currentQuery.minArea),
      maxArea: maxArea ?? (areaRangeKey ? undefined : currentQuery.maxArea),
    };

    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    router.push(
      localizeHref(`/bat-dong-san${queryString ? `?${queryString}` : ''}`),
    );
  };

  const isRent = currentQuery.transactionType === 'FOR_RENT';

  return (
    <form
      data-testid="search-quick-bar"
      onSubmit={handleQuickSubmit}
      className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-3 mt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3"
    >
      {/* Location */}
      <div className="flex-1 flex items-center gap-2 md:border-r border-[#E2E8F0] md:pr-3">
        <span
          className="material-symbols-outlined text-[#0F766E] text-xl flex-shrink-0"
          data-icon="location_on"
        >
          location_on
        </span>
        <div className="w-full">
          <label
            htmlFor="quick-province"
            className="block text-[11px] text-[#64748B] font-medium leading-tight"
          >
            {dict.SearchResults.quickBar.locationLabel}
          </label>
          <input
            id="quick-province"
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder={dict.SearchResults.quickBar.locationPlaceholder}
            className="w-full text-sm font-semibold text-[#142B4A] bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>

      {/* Property Type */}
      <div className="flex-1 flex items-center gap-2 md:border-r border-[#E2E8F0] md:pr-3">
        <span
          className="material-symbols-outlined text-[#64748B] text-xl flex-shrink-0"
          data-icon="apartment"
        >
          apartment
        </span>
        <div className="w-full">
          <label
            htmlFor="quick-property-type"
            className="block text-[11px] text-[#64748B] font-medium leading-tight"
          >
            {dict.SearchResults.quickBar.propertyTypeLabel}
          </label>
          <select
            id="quick-property-type"
            value={propertyType}
            onChange={(e) =>
              setPropertyType((e.target.value as PropertyType) || '')
            }
            className="w-full text-sm font-semibold text-[#142B4A] bg-transparent border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
          >
            <option value="">
              {dict.SearchResults.quickBar.propertyTypeAll}
            </option>
            <option value="APARTMENT">
              {dict.SearchResults.filterSidebar.propertyType.items.APARTMENT}
            </option>
            <option value="HOUSE">
              {dict.SearchResults.filterSidebar.propertyType.items.HOUSE}
            </option>
            <option value="LAND">
              {dict.SearchResults.filterSidebar.propertyType.items.LAND}
            </option>
            <option value="VILLA">
              {dict.SearchResults.filterSidebar.propertyType.items.VILLA}
            </option>
            <option value="COMMERCIAL">
              {dict.SearchResults.filterSidebar.propertyType.items.COMMERCIAL}
            </option>
            <option value="OTHER">
              {dict.SearchResults.filterSidebar.propertyType.items.OTHER}
            </option>
          </select>
        </div>
      </div>

      {/* Price Preset */}
      <div className="flex-1 flex items-center gap-2 md:border-r border-[#E2E8F0] md:pr-3">
        <span
          className="material-symbols-outlined text-[#64748B] text-xl flex-shrink-0"
          data-icon="payments"
        >
          payments
        </span>
        <div className="w-full">
          <label
            htmlFor="quick-price"
            className="block text-[11px] text-[#64748B] font-medium leading-tight"
          >
            {dict.SearchResults.quickBar.priceLabel}
          </label>
          <select
            id="quick-price"
            value={priceRangeKey}
            onChange={(e) => setPriceRangeKey(e.target.value)}
            className="w-full text-sm font-semibold text-[#142B4A] bg-transparent border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
          >
            <option value="">{dict.SearchResults.quickBar.priceAll}</option>
            {isRent ? (
              <>
                <option value="under-10m">
                  {dict.HeroSearch.rentPricePresets['under-10m']}
                </option>
                <option value="10m-20m">
                  {dict.HeroSearch.rentPricePresets['10m-20m']}
                </option>
                <option value="20m-50m">
                  {dict.HeroSearch.rentPricePresets['20m-50m']}
                </option>
                <option value="above-50m">
                  {dict.HeroSearch.rentPricePresets['above-50m']}
                </option>
              </>
            ) : (
              <>
                <option value="under-2b">
                  {dict.HeroSearch.salePricePresets['under-2b']}
                </option>
                <option value="2b-5b">2 - 5 tỷ</option>
                <option value="5b-10b">
                  {dict.HeroSearch.salePricePresets['5b-10b']}
                </option>
                <option value="above-10b">
                  {dict.HeroSearch.salePricePresets['above-10b']}
                </option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Area Preset */}
      <div className="flex-1 flex items-center gap-2 md:pr-2">
        <span
          className="material-symbols-outlined text-[#64748B] text-xl flex-shrink-0"
          data-icon="square_foot"
        >
          square_foot
        </span>
        <div className="w-full">
          <label
            htmlFor="quick-area"
            className="block text-[11px] text-[#64748B] font-medium leading-tight"
          >
            {dict.SearchResults.quickBar.areaLabel}
          </label>
          <select
            id="quick-area"
            value={areaRangeKey}
            onChange={(e) => setAreaRangeKey(e.target.value)}
            className="w-full text-sm font-semibold text-[#142B4A] bg-transparent border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
          >
            <option value="">{dict.SearchResults.quickBar.areaAll}</option>
            <option value="under-50">
              {dict.HeroSearch.areaPresets['under-50']}
            </option>
            <option value="50-80">
              {dict.HeroSearch.areaPresets['50-80']}
            </option>
            <option value="80-120">
              {dict.HeroSearch.areaPresets['80-120']}
            </option>
            <option value="120-200">
              {dict.HeroSearch.areaPresets['120-200']}
            </option>
            <option value="above-200">
              {dict.HeroSearch.areaPresets['above-200']}
            </option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="bg-[#0F766E] hover:bg-[#0D655E] text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
      >
        <span className="material-symbols-outlined text-lg">search</span>
        <span>{dict.SearchResults.quickBar.searchButton}</span>
      </button>
    </form>
  );
}
