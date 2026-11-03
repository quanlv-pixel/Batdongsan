'use client';

import React from 'react';
import Link from 'next/link';
import { PropertyType } from '@/types';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface CategoryCardConfig {
  propertyType: PropertyType;
  icon: string;
}

const PROPERTY_CATEGORIES: readonly CategoryCardConfig[] = [
  {
    propertyType: 'APARTMENT',
    icon: 'apartment',
  },
  {
    propertyType: 'HOUSE',
    icon: 'cottage',
  },
  {
    propertyType: 'LAND',
    icon: 'landscape',
  },
  {
    propertyType: 'VILLA',
    icon: 'villa',
  },
  {
    propertyType: 'COMMERCIAL',
    icon: 'desk',
  },
  {
    propertyType: 'OTHER',
    icon: 'holiday_village',
  },
];

export function CategoryGrid() {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  return (
    <section
      aria-labelledby="categories-heading"
      className="py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
        <div>
          <h2
            id="categories-heading"
            className="text-2xl font-bold text-[#142B4A]"
          >
            {dict.CategoryGrid.heading}
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            {dict.CategoryGrid.subtitle}
          </p>
        </div>
        <Link
          href={localizeHref('/bat-dong-san')}
          className="mt-3 md:mt-0 text-sm font-semibold text-[#0F766E] hover:underline flex items-center gap-1 group w-fit"
        >
          <span>{dict.CategoryGrid.viewAll}</span>
          <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* 6 Category Cards Mapped 1-to-1 to PropertyType Enum */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {PROPERTY_CATEGORIES.map((category) => {
          const itemCopy = dict.CategoryGrid.items[category.propertyType];
          return (
            <Link
              key={category.propertyType}
              href={localizeHref(
                `/bat-dong-san?propertyType=${category.propertyType}`,
              )}
              className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-[#0F766E] hover:shadow-md transition-all group flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-colors mb-3">
                <span className="material-symbols-outlined text-2xl">
                  {category.icon}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#142B4A] group-hover:text-[#0F766E] transition-colors">
                {itemCopy.label}
              </h3>
              <span className="text-xs text-[#64748B] mt-1">
                {itemCopy.subtitle}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
