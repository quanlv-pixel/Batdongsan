'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyType, TransactionType } from '@/types';
import { buildListingsSearchParams } from '@/lib/formatters';

interface PricePreset {
  label: string;
  minPrice: string;
  maxPrice: string;
}

interface AreaPreset {
  label: string;
  minArea: string;
  maxArea: string;
}

const SALE_PRICE_PRESETS: Record<string, PricePreset> = {
  'under-2b': { label: 'Dưới 2 tỷ', minPrice: '', maxPrice: '2000000000' },
  '2b-3b': {
    label: '2 - 3 tỷ',
    minPrice: '2000000000',
    maxPrice: '3000000000',
  },
  '3b-5b': {
    label: '3 - 5 tỷ',
    minPrice: '3000000000',
    maxPrice: '5000000000',
  },
  '5b-10b': {
    label: '5 - 10 tỷ',
    minPrice: '5000000000',
    maxPrice: '10000000000',
  },
  'above-10b': { label: 'Trên 10 tỷ', minPrice: '10000000000', maxPrice: '' },
};

const RENT_PRICE_PRESETS: Record<string, PricePreset> = {
  'under-10m': { label: 'Dưới 10 triệu', minPrice: '', maxPrice: '10000000' },
  '10m-20m': {
    label: '10 - 20 triệu',
    minPrice: '10000000',
    maxPrice: '20000000',
  },
  '20m-50m': {
    label: '20 - 50 triệu',
    minPrice: '20000000',
    maxPrice: '50000000',
  },
  'above-50m': { label: 'Trên 50 triệu', minPrice: '50000000', maxPrice: '' },
};

const AREA_PRESETS: Record<string, AreaPreset> = {
  'under-50': { label: 'Dưới 50 m²', minArea: '', maxArea: '50' },
  '50-80': { label: '50 - 80 m²', minArea: '50', maxArea: '80' },
  '80-120': { label: '80 - 120 m²', minArea: '80', maxArea: '120' },
  '120-200': { label: '120 - 200 m²', minArea: '120', maxArea: '200' },
  'above-200': { label: 'Trên 200 m²', minArea: '200', maxArea: '' },
};

export function HeroSearchBox() {
  const router = useRouter();

  const [transactionType, setTransactionType] =
    useState<TransactionType>('FOR_SALE');
  const [province, setProvince] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
  const [pricePreset, setPricePreset] = useState<string>('');
  const [areaPreset, setAreaPreset] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minArea, setMinArea] = useState<string>('');
  const [maxArea, setMaxArea] = useState<string>('');

  const activePricePresets =
    transactionType === 'FOR_RENT' ? RENT_PRICE_PRESETS : SALE_PRICE_PRESETS;

  const handleTabChange = (nextTxType: TransactionType) => {
    setTransactionType(nextTxType);
    setPricePreset('');
    setMinPrice('');
    setMaxPrice('');
  };

  const handlePricePresetChange = (presetKey: string) => {
    setPricePreset(presetKey);
    if (!presetKey) {
      setMinPrice('');
      setMaxPrice('');
      return;
    }
    const preset = activePricePresets[presetKey];
    if (preset) {
      setMinPrice(preset.minPrice);
      setMaxPrice(preset.maxPrice);
    }
  };

  const handleAreaPresetChange = (presetKey: string) => {
    setAreaPreset(presetKey);
    if (!presetKey) {
      setMinArea('');
      setMaxArea('');
      return;
    }
    const preset = AREA_PRESETS[presetKey];
    if (preset) {
      setMinArea(preset.minArea);
      setMaxArea(preset.maxArea);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedMinArea =
      minArea.trim().length > 0 && !Number.isNaN(Number(minArea.trim()))
        ? Number(minArea.trim())
        : undefined;
    const parsedMaxArea =
      maxArea.trim().length > 0 && !Number.isNaN(Number(maxArea.trim()))
        ? Number(maxArea.trim())
        : undefined;

    const searchParams = buildListingsSearchParams({
      transactionType,
      province: province.trim() || undefined,
      district: district.trim() || undefined,
      propertyType: propertyType || undefined,
      minPrice: minPrice.trim() || undefined,
      maxPrice: maxPrice.trim() || undefined,
      minArea: parsedMinArea,
      maxArea: parsedMaxArea,
    });

    const queryString = searchParams.toString();
    router.push(`/bat-dong-san${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <section className="relative pt-10 pb-16 lg:pt-12 lg:pb-20 overflow-hidden bg-gradient-to-b from-[#F1F5F9] to-[#F8FAFC] border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Headline & Subtitle */}
        <div className="text-center max-w-3xl mx-auto mb-8 lg:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#142B4A] leading-tight tracking-tight mb-3">
            Tìm bất động sản phù hợp với bạn
          </h1>
          <p className="text-base lg:text-lg text-[#475569] max-w-2xl mx-auto">
            Khám phá nơi ở lý tưởng và cơ hội đầu tư phù hợp với nhu cầu của bạn.
          </p>
        </div>

        {/* Property Search Panel Card */}
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 lg:p-6">
          {/* 3 Classification Tabs */}
          <div
            role="tablist"
            aria-label="Hình thức giao dịch"
            className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-4 mb-5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={transactionType === 'FOR_SALE'}
              onClick={() => handleTabChange('FOR_SALE')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                transactionType === 'FOR_SALE'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0F766E] hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">sell</span>
              <span>Mua bán</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={transactionType === 'FOR_RENT'}
              onClick={() => handleTabChange('FOR_RENT')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                transactionType === 'FOR_RENT'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0F766E] hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">key</span>
              <span>Cho thuê</span>
            </button>

            <button
              type="button"
              role="tab"
              disabled
              aria-disabled="true"
              aria-selected={false}
              title="Mô-đun Dự án đang phát triển"
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#94A3B8] bg-slate-50 border border-slate-200 cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                apartment
              </span>
              <span>Dự án</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-[#475569]">
                Sắp ra mắt
              </span>
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primary Row: Location, Property Type, Price Range, Area Range, Submit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* 1. Province */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-province"
                  className="block text-xs font-medium text-[#475569] mb-1"
                >
                  Tỉnh / Thành phố
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#64748B] absolute left-3 text-lg pointer-events-none">
                    location_on
                  </span>
                  <input
                    id="hero-province"
                    name="province"
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="VD: TP. Hồ Chí Minh"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 text-xs lg:text-sm bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all"
                  />
                </div>
              </div>

              {/* 2. District */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-district"
                  className="block text-xs font-medium text-[#475569] mb-1"
                >
                  Quận / Huyện
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#64748B] absolute left-3 text-lg pointer-events-none">
                    map
                  </span>
                  <input
                    id="hero-district"
                    name="district"
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="VD: Quận 1"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 text-xs lg:text-sm bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all"
                  />
                </div>
              </div>

              {/* 3. Property Type */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-property-type"
                  className="block text-xs font-medium text-[#475569] mb-1"
                >
                  Loại bất động sản
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#64748B] absolute left-3 text-lg pointer-events-none">
                    home_work
                  </span>
                  <select
                    id="hero-property-type"
                    name="propertyType"
                    value={propertyType}
                    onChange={(e) =>
                      setPropertyType(e.target.value as PropertyType | '')
                    }
                    className="w-full pl-9 pr-7 py-2.5 text-xs lg:text-sm bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Tất cả loại BĐS</option>
                    <option value="APARTMENT">Căn hộ chung cư</option>
                    <option value="HOUSE">Nhà ở / Nhà phố</option>
                    <option value="VILLA">Biệt thự</option>
                    <option value="LAND">Đất nền</option>
                    <option value="COMMERCIAL">Thương mại / Văn phòng</option>
                    <option value="OTHER">Bất động sản khác</option>
                  </select>
                  <span className="material-symbols-outlined text-[#64748B] absolute right-2 text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 4. Price Preset */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-price-preset"
                  className="block text-xs font-medium text-[#475569] mb-1"
                >
                  Khoảng giá
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#64748B] absolute left-3 text-lg pointer-events-none">
                    payments
                  </span>
                  <select
                    id="hero-price-preset"
                    value={pricePreset}
                    onChange={(e) => handlePricePresetChange(e.target.value)}
                    className="w-full pl-9 pr-7 py-2.5 text-xs lg:text-sm bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Mức giá (VNĐ)</option>
                    {Object.entries(activePricePresets).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[#64748B] absolute right-2 text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 5. Area Preset */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-area-preset"
                  className="block text-xs font-medium text-[#475569] mb-1"
                >
                  Diện tích
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined text-[#64748B] absolute left-3 text-lg pointer-events-none">
                    square_foot
                  </span>
                  <select
                    id="hero-area-preset"
                    value={areaPreset}
                    onChange={(e) => handleAreaPresetChange(e.target.value)}
                    className="w-full pl-9 pr-7 py-2.5 text-xs lg:text-sm bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Diện tích (m²)</option>
                    {Object.entries(AREA_PRESETS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[#64748B] absolute right-2 text-base pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 6. Search Submit CTA */}
              <div className="sm:col-span-2 lg:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#0F766E] hover:bg-[#0D655E] text-white font-semibold text-sm rounded-lg transition-all duration-150 active:scale-95 shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">
                    search
                  </span>
                  <span>Tìm kiếm</span>
                </button>
              </div>
            </div>

            {/* Secondary Row: Custom Min/Max Price & Min/Max Area inputs */}
            <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="hero-min-price"
                  className="block text-[11px] font-medium text-[#64748B] mb-1"
                >
                  Giá tối thiểu (VNĐ)
                </label>
                <input
                  id="hero-min-price"
                  name="minPrice"
                  type="text"
                  inputMode="numeric"
                  value={minPrice}
                  onChange={(e) => {
                    setPricePreset('');
                    setMinPrice(e.target.value);
                  }}
                  placeholder="VD: 2000000000"
                  className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-max-price"
                  className="block text-[11px] font-medium text-[#64748B] mb-1"
                >
                  Giá tối đa (VNĐ)
                </label>
                <input
                  id="hero-max-price"
                  name="maxPrice"
                  type="text"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(e) => {
                    setPricePreset('');
                    setMaxPrice(e.target.value);
                  }}
                  placeholder="VD: 5000000000"
                  className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-min-area"
                  className="block text-[11px] font-medium text-[#64748B] mb-1"
                >
                  Diện tích tối thiểu (m²)
                </label>
                <input
                  id="hero-min-area"
                  name="minArea"
                  type="text"
                  inputMode="decimal"
                  value={minArea}
                  onChange={(e) => {
                    setAreaPreset('');
                    setMinArea(e.target.value);
                  }}
                  placeholder="VD: 50"
                  className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-max-area"
                  className="block text-[11px] font-medium text-[#64748B] mb-1"
                >
                  Diện tích tối đa (m²)
                </label>
                <input
                  id="hero-max-area"
                  name="maxArea"
                  type="text"
                  inputMode="decimal"
                  value={maxArea}
                  onChange={(e) => {
                    setAreaPreset('');
                    setMaxArea(e.target.value);
                  }}
                  placeholder="VD: 120"
                  className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
