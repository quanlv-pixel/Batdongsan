'use client';

import React from 'react';
import Link from 'next/link';
import { useDictionary, useLocalizedHref } from '@/i18n';

export function Footer() {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  return (
    <footer className="w-full bg-[#1E293B] border-t border-[#334155] text-[#F1F5F9] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 flex flex-col gap-8">
        {/* 4 Columns Grid from Stitch Homepage */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-8 border-b border-[#334155]">
          {/* Column 1: Brand & Description */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              href={localizeHref('/')}
              className="flex items-center gap-2.5 w-fit"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">domain</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                {dict.Footer.brandName}
              </span>
            </Link>
            <p className="text-sm text-[#CBD5E1] leading-relaxed pr-2">
              {dict.Footer.description}
            </p>
          </div>

          {/* Column 2: Danh mục tìm kiếm (Valid routes only) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">
              {dict.Footer.exploreHeading}
            </h4>
            <Link
              href={localizeHref('/bat-dong-san?transactionType=FOR_SALE')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.forSaleLink}
            </Link>
            <Link
              href={localizeHref('/bat-dong-san?transactionType=FOR_RENT')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.forRentLink}
            </Link>
            <Link
              href={localizeHref('/bat-dong-san?propertyType=APARTMENT')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.apartmentLink}
            </Link>
            <Link
              href={localizeHref('/bat-dong-san?propertyType=HOUSE')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.houseLink}
            </Link>
          </div>

          {/* Column 3: Dành cho thành viên (Valid routes only) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">
              {dict.Footer.customerHeading}
            </h4>
            <Link
              href={localizeHref('/')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.homeLink}
            </Link>
            <Link
              href={localizeHref('/login')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.loginLink}
            </Link>
            <Link
              href={localizeHref('/register')}
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              {dict.Footer.registerLink}
            </Link>
          </div>

          {/* Column 4: Hỗ trợ */}
          <div className="lg:col-span-2 flex flex-col gap-3 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">
              {dict.Footer.supportHeading}
            </h4>
            <div className="flex flex-col gap-1 text-[#CBD5E1]">
              <span className="text-xs text-[#94A3B8]">
                {dict.Footer.supportEmailLabel}
              </span>
              <a
                href="mailto:hotro@batdongsan.local"
                className="text-white hover:text-[#5EEAD4] transition-colors font-medium"
              >
                hotro@batdongsan.local
              </a>
            </div>
            <div className="flex flex-col gap-1 text-[#CBD5E1]">
              <span className="text-xs text-[#94A3B8]">
                {dict.Footer.workingHoursLabel}
              </span>
              <span className="text-white">
                {dict.Footer.workingHoursValue}
              </span>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-3">
          <p>{dict.Footer.copyright}</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>{dict.Footer.operatingRules}</span>
            <span className="text-[#475569]">•</span>
            <span>{dict.Footer.privacyPolicy}</span>
            <span className="text-[#475569]">•</span>
            <span>{dict.Footer.termsOfService}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
