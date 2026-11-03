import React from 'react';
import Link from 'next/link';
import { PropertyType } from '@/types';

interface CategoryCardItem {
  propertyType: PropertyType;
  label: string;
  subtitle: string;
  icon: string;
}

const PROPERTY_CATEGORIES: readonly CategoryCardItem[] = [
  {
    propertyType: 'APARTMENT',
    label: 'Căn hộ chung cư',
    subtitle: 'Chung cư & căn hộ dịch vụ',
    icon: 'apartment',
  },
  {
    propertyType: 'HOUSE',
    label: 'Nhà ở & Nhà phố',
    subtitle: 'Nhà riêng lẻ & nhà mặt phố',
    icon: 'cottage',
  },
  {
    propertyType: 'LAND',
    label: 'Đất nền',
    subtitle: 'Đất thổ cư & đất phân lô',
    icon: 'landscape',
  },
  {
    propertyType: 'VILLA',
    label: 'Biệt thự',
    subtitle: 'Biệt thự đơn lập & song lập',
    icon: 'villa',
  },
  {
    propertyType: 'COMMERCIAL',
    label: 'Văn phòng & Thương mại',
    subtitle: 'Mặt bằng & tòa nhà văn phòng',
    icon: 'desk',
  },
  {
    propertyType: 'OTHER',
    label: 'Loại hình khác',
    subtitle: 'Kho xưởng & bất động sản khác',
    icon: 'holiday_village',
  },
];

export function CategoryGrid() {
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
            Khám phá bất động sản
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            Lựa chọn loại hình phù hợp với mục tiêu tìm kiếm của bạn
          </p>
        </div>
        <Link
          href="/bat-dong-san"
          className="mt-3 md:mt-0 text-sm font-semibold text-[#0F766E] hover:underline flex items-center gap-1 group w-fit"
        >
          <span>Xem tất cả bất động sản</span>
          <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* 6 Category Cards Mapped 1-to-1 to PropertyType Enum */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {PROPERTY_CATEGORIES.map((category) => (
          <Link
            key={category.propertyType}
            href={`/bat-dong-san?propertyType=${category.propertyType}`}
            className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-[#0F766E] hover:shadow-md transition-all group flex flex-col items-center text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-colors mb-3">
              <span className="material-symbols-outlined text-2xl">
                {category.icon}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#142B4A] group-hover:text-[#0F766E] transition-colors">
              {category.label}
            </h3>
            <span className="text-xs text-[#64748B] mt-1">
              {category.subtitle}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
