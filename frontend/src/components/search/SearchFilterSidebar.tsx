'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyType, PublicListingsQuery, TransactionType } from '@/types';
import {
  buildListingsSearchParams,
  validateFilterRanges,
} from '@/lib/formatters';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface SearchFilterSidebarProps {
  currentQuery: PublicListingsQuery;
  onApply?: () => void;
}

export function SearchFilterSidebar({
  currentQuery,
  onApply,
}: SearchFilterSidebarProps) {
  const router = useRouter();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const [transactionType, setTransactionType] = useState<
    TransactionType | 'ALL'
  >(currentQuery.transactionType || 'ALL');
  const [province, setProvince] = useState<string>(
    currentQuery.province || '',
  );
  const [district, setDistrict] = useState<string>(
    currentQuery.district || '',
  );
  const [ward, setWard] = useState<string>(currentQuery.ward || '');
  const [propertyType, setPropertyType] = useState<PropertyType | 'ALL'>(
    currentQuery.propertyType || 'ALL',
  );
  const [minPrice, setMinPrice] = useState<string>(
    currentQuery.minPrice || '',
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    currentQuery.maxPrice || '',
  );
  const [minArea, setMinArea] = useState<string>(
    currentQuery.minArea !== undefined ? String(currentQuery.minArea) : '',
  );
  const [maxArea, setMaxArea] = useState<string>(
    currentQuery.maxArea !== undefined ? String(currentQuery.maxArea) : '',
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const parsedMinArea =
      minArea.trim().length > 0 && !Number.isNaN(Number(minArea.trim()))
        ? Number(minArea.trim())
        : undefined;
    const parsedMaxArea =
      maxArea.trim().length > 0 && !Number.isNaN(Number(maxArea.trim()))
        ? Number(maxArea.trim())
        : undefined;

    // Range validation
    const errors = validateFilterRanges(
      {
        minPrice: minPrice.trim() || undefined,
        maxPrice: maxPrice.trim() || undefined,
        minArea: parsedMinArea,
        maxArea: parsedMaxArea,
      },
      {
        priceMinExceedsMax:
          dict.SearchResults.validation.priceMinExceedsMax,
        areaMinExceedsMax:
          dict.SearchResults.validation.areaMinExceedsMax,
      },
    );

    if (errors.priceError) {
      setValidationError(errors.priceError);
      return;
    }
    if (errors.areaError) {
      setValidationError(errors.areaError);
      return;
    }

    setValidationError(null);

    const nextQuery: PublicListingsQuery = {
      page: 1, // Always reset to page 1 on filter application
      transactionType:
        transactionType !== 'ALL' ? transactionType : undefined,
      propertyType: propertyType !== 'ALL' ? propertyType : undefined,
      province: province.trim() || undefined,
      district: district.trim() || undefined,
      ward: ward.trim() || undefined,
      minPrice: minPrice.trim() || undefined,
      maxPrice: maxPrice.trim() || undefined,
      minArea: parsedMinArea,
      maxArea: parsedMaxArea,
    };

    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    router.push(
      localizeHref(`/bat-dong-san${queryString ? `?${queryString}` : ''}`),
    );

    if (onApply) {
      onApply();
    }
  };

  const handleReset = () => {
    setTransactionType('ALL');
    setProvince('');
    setDistrict('');
    setWard('');
    setPropertyType('ALL');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setValidationError(null);

    router.push(localizeHref('/bat-dong-san'));

    if (onApply) {
      onApply();
    }
  };

  const propertyTypesList: Array<{ value: PropertyType | 'ALL'; label: string }> = [
    {
      value: 'ALL',
      label: dict.SearchResults.filterSidebar.propertyType.all,
    },
    {
      value: 'APARTMENT',
      label: dict.SearchResults.filterSidebar.propertyType.items.APARTMENT,
    },
    {
      value: 'HOUSE',
      label: dict.SearchResults.filterSidebar.propertyType.items.HOUSE,
    },
    {
      value: 'LAND',
      label: dict.SearchResults.filterSidebar.propertyType.items.LAND,
    },
    {
      value: 'VILLA',
      label: dict.SearchResults.filterSidebar.propertyType.items.VILLA,
    },
    {
      value: 'COMMERCIAL',
      label: dict.SearchResults.filterSidebar.propertyType.items.COMMERCIAL,
    },
    {
      value: 'OTHER',
      label: dict.SearchResults.filterSidebar.propertyType.items.OTHER,
    },
  ];

  return (
    <div
      data-testid="search-filter-sidebar"
      className="bg-white rounded-lg border border-[#E2E8F0] p-5 lg:p-6 shadow-sm"
    >
      {/* Title & Reset Button */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#0F766E] text-xl"
            data-icon="tune"
          >
            tune
          </span>
          <h2 className="text-base font-bold text-[#142B4A]">
            {dict.SearchResults.filterSidebar.heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-[#0F766E] font-medium hover:underline cursor-pointer focus:outline-none"
        >
          {dict.SearchResults.filterSidebar.resetButton}
        </button>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2"
        >
          <span className="material-symbols-outlined text-base text-red-600 flex-shrink-0">
            error
          </span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleApply} className="space-y-5 text-sm">
        {/* Transaction Type */}
        <div>
          <label className="block text-xs font-semibold text-[#142B4A] mb-2 uppercase tracking-wide">
            {dict.SearchResults.filterSidebar.transactionType.title}
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F1F5F9] rounded-lg">
            <button
              type="button"
              onClick={() => setTransactionType('ALL')}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                transactionType === 'ALL'
                  ? 'bg-white text-[#0F766E] shadow-sm'
                  : 'text-[#475569] hover:text-[#142B4A]'
              }`}
            >
              {dict.SearchResults.filterSidebar.transactionType.all}
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('FOR_SALE')}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                transactionType === 'FOR_SALE'
                  ? 'bg-white text-[#0F766E] shadow-sm'
                  : 'text-[#475569] hover:text-[#142B4A]'
              }`}
            >
              {dict.SearchResults.filterSidebar.transactionType.forSale}
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('FOR_RENT')}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                transactionType === 'FOR_RENT'
                  ? 'bg-white text-[#0F766E] shadow-sm'
                  : 'text-[#475569] hover:text-[#142B4A]'
              }`}
            >
              {dict.SearchResults.filterSidebar.transactionType.forRent}
            </button>
          </div>
        </div>

        {/* Location Group */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-xs font-semibold text-[#142B4A] mb-2 uppercase tracking-wide">
            {dict.SearchResults.filterSidebar.location.title}
          </label>
          <div className="space-y-2">
            <div>
              <label
                htmlFor="filter-province"
                className="block text-[11px] text-[#64748B] mb-0.5"
              >
                {dict.SearchResults.filterSidebar.location.provinceLabel}
              </label>
              <input
                id="filter-province"
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.location.provincePlaceholder
                }
                className="w-full text-xs font-medium text-[#142B4A] border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label
                htmlFor="filter-district"
                className="block text-[11px] text-[#64748B] mb-0.5"
              >
                {dict.SearchResults.filterSidebar.location.districtLabel}
              </label>
              <input
                id="filter-district"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.location.districtPlaceholder
                }
                className="w-full text-xs font-medium text-[#142B4A] border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label
                htmlFor="filter-ward"
                className="block text-[11px] text-[#64748B] mb-0.5"
              >
                {dict.SearchResults.filterSidebar.location.wardLabel}
              </label>
              <input
                id="filter-ward"
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.location.wardPlaceholder
                }
                className="w-full text-xs font-medium text-[#142B4A] border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>
        </div>

        {/* Property Type Group */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-xs font-semibold text-[#142B4A] mb-2 uppercase tracking-wide">
            {dict.SearchResults.filterSidebar.propertyType.title}
          </label>
          <div className="space-y-1.5 text-xs text-[#475569]">
            {propertyTypesList.map((item) => (
              <label
                key={item.value}
                className="flex items-center gap-2.5 cursor-pointer hover:text-[#142B4A]"
              >
                <input
                  type="radio"
                  name="propertyType"
                  value={item.value}
                  checked={propertyType === item.value}
                  onChange={() => setPropertyType(item.value)}
                  className="rounded-full text-[#0F766E] focus:ring-[#0F766E] border-[#CBD5E1] h-4 w-4"
                />
                <span
                  className={
                    propertyType === item.value
                      ? 'font-medium text-[#142B4A]'
                      : ''
                  }
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range Group */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-xs font-semibold text-[#142B4A] mb-2 uppercase tracking-wide">
            {dict.SearchResults.filterSidebar.price.title}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-[#64748B] block mb-1">
                {dict.SearchResults.filterSidebar.price.from}
              </span>
              <input
                type="text"
                data-testid="sidebar-min-price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.price.minPlaceholder
                }
                className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block mb-1">
                {dict.SearchResults.filterSidebar.price.to}
              </span>
              <input
                type="text"
                data-testid="sidebar-max-price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.price.maxPlaceholder
                }
                className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>
        </div>

        {/* Area Range Group */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-xs font-semibold text-[#142B4A] mb-2 uppercase tracking-wide">
            {dict.SearchResults.filterSidebar.area.title}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-[#64748B] block mb-1">
                {dict.SearchResults.filterSidebar.area.from}
              </span>
              <input
                type="text"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.area.minPlaceholder
                }
                className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block mb-1">
                {dict.SearchResults.filterSidebar.area.to}
              </span>
              <input
                type="text"
                value={maxArea}
                onChange={(e) => setMaxArea(e.target.value)}
                placeholder={
                  dict.SearchResults.filterSidebar.area.maxPlaceholder
                }
                className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>
        </div>

        {/* Section 6.1: Truthful Presentation of Unsupported Backend Filters */}
        <div className="border-t border-[#E2E8F0] pt-4 opacity-75">
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide">
              {dict.SearchResults.filterSidebar.upcoming.title}
            </label>
          </div>
          <p className="text-[11px] text-[#64748B] italic mb-3 leading-tight">
            {dict.SearchResults.filterSidebar.upcoming.notice}
          </p>

          <div className="space-y-3">
            <div>
              <span className="block text-[11px] text-[#94A3B8] font-medium mb-1">
                {dict.SearchResults.filterSidebar.upcoming.bedrooms}
              </span>
              <div className="grid grid-cols-5 gap-1">
                {[
                  dict.SearchResults.filterSidebar.transactionType.all,
                  '1+',
                  '2+',
                  '3+',
                  '4+',
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="border border-[#E2E8F0] text-[#94A3B8] text-[11px] py-1 rounded bg-[#F8FAFC] cursor-not-allowed"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-[#94A3B8] font-medium mb-1">
                {dict.SearchResults.filterSidebar.upcoming.legalStatus}
              </span>
              <div className="space-y-1 text-xs text-[#94A3B8]">
                <label className="flex items-center gap-2 cursor-not-allowed">
                  <input
                    type="checkbox"
                    disabled
                    aria-disabled="true"
                    className="rounded border-[#CBD5E1] h-3.5 w-3.5 text-gray-300 cursor-not-allowed"
                  />
                  <span>
                    {dict.SearchResults.filterSidebar.upcoming.legalRedBook}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed">
                  <input
                    type="checkbox"
                    disabled
                    aria-disabled="true"
                    className="rounded border-[#CBD5E1] h-3.5 w-3.5 text-gray-300 cursor-not-allowed"
                  />
                  <span>
                    {dict.SearchResults.filterSidebar.upcoming.legalContract}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            data-testid="sidebar-apply-btn"
            className="w-full bg-[#0F766E] text-white py-2.5 rounded-lg font-medium text-sm shadow-sm hover:bg-[#0D655E] transition-colors cursor-pointer"
          >
            {dict.SearchResults.filterSidebar.applyButton}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-[#64748B] hover:text-[#0F766E] text-xs font-medium py-1.5 transition-colors cursor-pointer"
          >
            {dict.SearchResults.filterSidebar.clearButton}
          </button>
        </div>
      </form>
    </div>
  );
}
