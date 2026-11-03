'use client';

import React from 'react';
import { useDictionary } from '@/i18n';

const PLATFORM_BENEFIT_KEYS = [
  {
    key: 'search' as const,
    icon: 'tune',
  },
  {
    key: 'transparency' as const,
    icon: 'verified_user',
  },
  {
    key: 'management' as const,
    icon: 'hub',
  },
] as const;

export function TrustBenefits() {
  const dict = useDictionary();

  return (
    <section
      aria-labelledby="trust-benefits-heading"
      className="py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
        <h2
          id="trust-benefits-heading"
          className="text-2xl lg:text-3xl font-bold text-[#142B4A]"
        >
          {dict.TrustBenefits.heading}
        </h2>
        <p className="text-sm lg:text-base text-[#475569] mt-2">
          {dict.TrustBenefits.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {PLATFORM_BENEFIT_KEYS.map((item) => {
          const benefit = dict.TrustBenefits.items[item.key];
          return (
            <div
              key={item.key}
              className="bg-white p-6 lg:p-7 rounded-lg border border-[#E2E8F0] shadow-sm flex flex-col items-start hover:border-[#0F766E]/50 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-[#F1F5F9] text-[#0F766E] flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-2xl">
                  {item.icon}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#142B4A] mb-2.5">
                {benefit.title}
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                {benefit.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
