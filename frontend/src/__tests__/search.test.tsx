import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  parseListingsSearchParams,
  validateFilterRanges,
} from '@/lib/formatters';
import { buildLocalizedPageMetadata } from '@/i18n/metadata';
import { AppLocaleProvider } from '@/i18n';
import { getDictionary } from '@/i18n/dictionaries';
import { SearchResultsView } from '@/app/[locale]/bat-dong-san/page';
import { SearchFilterSidebar } from '@/components/search/SearchFilterSidebar';
import { MobileFilterDrawer } from '@/components/search/MobileFilterDrawer';
import { SearchPagination } from '@/components/search/SearchPagination';
import { ActiveFilterTags } from '@/components/search/ActiveFilterTags';
import {
  PublicListingSummary,
  PublicListingsQuery,
  PublicListingsResponse,
} from '@/types';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

const sampleListing: PublicListingSummary = {
  id: 'listing_test_01',
  title: 'Căn hộ Masteri Centre Point 2PN view công viên',
  description: 'Căn hộ cao cấp thoáng mát, bàn giao nội thất chuẩn quốc tế.',
  propertyType: 'APARTMENT',
  transactionType: 'FOR_SALE',
  priceVnd: '3200000000',
  rentalPeriod: null,
  areaSqm: 78,
  province: 'TP. Hồ Chí Minh',
  district: 'TP. Thủ Đức',
  ward: 'Phường Long Bình',
  status: 'APPROVED',
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-01T08:00:00.000Z',
  images: [
    {
      id: 'img_01',
      url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      order: 1,
    },
    {
      id: 'img_02',
      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      order: 2,
    },
  ],
};

const sampleResponse: PublicListingsResponse = {
  data: [sampleListing],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

describe('Phase 2E-2B: Public Property Search Results Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Query String Parsing & Validation (parseListingsSearchParams)', () => {
    it('parses valid supported query parameters correctly', () => {
      const params = new URLSearchParams({
        transactionType: 'FOR_SALE',
        propertyType: 'APARTMENT',
        province: '  TP. Hồ Chí Minh  ',
        district: 'Quận 1',
        ward: 'Bến Nghé',
        minPrice: '2000000000',
        maxPrice: '5000000000',
        minArea: '50',
        maxArea: '100',
        page: '2',
        limit: '15',
      });

      const parsed = parseListingsSearchParams(params);

      expect(parsed.transactionType).toBe('FOR_SALE');
      expect(parsed.propertyType).toBe('APARTMENT');
      expect(parsed.province).toBe('TP. Hồ Chí Minh');
      expect(parsed.district).toBe('Quận 1');
      expect(parsed.ward).toBe('Bến Nghé');
      expect(parsed.minPrice).toBe('2000000000');
      expect(parsed.maxPrice).toBe('5000000000');
      expect(parsed.minArea).toBe(50);
      expect(parsed.maxArea).toBe(100);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(15);
    });

    it('rejects invalid enum values safely', () => {
      const params = new URLSearchParams({
        transactionType: 'INVALID_TX',
        propertyType: 'PENTHOUSE', // Not in Backend enum
      });

      const parsed = parseListingsSearchParams(params);

      expect(parsed.transactionType).toBeUndefined();
      expect(parsed.propertyType).toBeUndefined();
    });

    it('rejects invalid and negative numeric price and area filters', () => {
      const params = new URLSearchParams({
        minPrice: '-500000',
        maxPrice: 'abc',
        minArea: '-10',
        maxArea: 'invalid',
      });

      const parsed = parseListingsSearchParams(params);

      expect(parsed.minPrice).toBeUndefined();
      expect(parsed.maxPrice).toBeUndefined();
      expect(parsed.minArea).toBeUndefined();
      expect(parsed.maxArea).toBeUndefined();
    });

    it('handles pagination boundary cases safely', () => {
      const zeroPage = parseListingsSearchParams(
        new URLSearchParams({ page: '0', limit: '0' }),
      );
      expect(zeroPage.page).toBeUndefined();
      expect(zeroPage.limit).toBeUndefined();

      const exceedLimit = parseListingsSearchParams(
        new URLSearchParams({ page: '-5', limit: '500' }),
      );
      expect(exceedLimit.page).toBeUndefined();
      expect(exceedLimit.limit).toBeUndefined();
    });
  });

  describe('2. Filter Range Validation (validateFilterRanges)', () => {
    it('detects when minPrice exceeds maxPrice', () => {
      const errors = validateFilterRanges({
        minPrice: '5000000000',
        maxPrice: '2000000000',
      });
      expect(errors.priceError).toBeDefined();
    });

    it('detects when minArea exceeds maxArea', () => {
      const errors = validateFilterRanges({
        minArea: 100,
        maxArea: 50,
      });
      expect(errors.areaError).toBeDefined();
    });

    it('passes when ranges are valid or single-sided', () => {
      const valid = validateFilterRanges({
        minPrice: '2000000000',
        maxPrice: '5000000000',
        minArea: 50,
        maxArea: 80,
      });
      expect(valid.priceError).toBeUndefined();
      expect(valid.areaError).toBeUndefined();

      const singleSided = validateFilterRanges({
        minPrice: '2000000000',
        minArea: 50,
      });
      expect(singleSided.priceError).toBeUndefined();
      expect(singleSided.areaError).toBeUndefined();
    });
  });

  describe('3. Search Results Rendering & Layout', () => {
    it('renders matching listings in horizontal format with real prices and details in Vietnamese', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchResultsView
            query={{ transactionType: 'FOR_SALE' }}
            response={sampleResponse}
            errorMessage={null}
            locale="vi"
          />
        </AppLocaleProvider>,
      );

      expect(
        screen.getByRole('heading', { name: 'Kết quả tìm kiếm bất động sản' }),
      ).toBeDefined();
      expect(screen.getByTestId('search-approved-badge').textContent).toContain(
        'Tin đăng đã kiểm duyệt',
      );
      expect(screen.queryByText('Dữ liệu minh họa')).toBeNull();
      expect(screen.getByTestId('search-results-count').textContent).toContain(
        '1 kết quả',
      );
      const resultsList = screen.getByTestId('search-results-list');
      expect(
        within(resultsList).getByText('Căn hộ Masteri Centre Point 2PN view công viên'),
      ).toBeDefined();
      expect(within(resultsList).getByText('3,2 tỷ')).toBeDefined();
      expect(within(resultsList).getByText('78 m²')).toBeDefined();
      expect(within(resultsList).getByText('Căn hộ chung cư')).toBeDefined();
      expect(within(resultsList).getByText(/Phường Long Bình, TP. Thủ Đức/)).toBeDefined();
    });

    it('renders matching listings in English without mixed Vietnamese UI strings', () => {
      render(
        <AppLocaleProvider
          locale="en"
          messages={getDictionary('en')}
          prefixEnabled={true}
        >
          <SearchResultsView
            query={{ transactionType: 'FOR_RENT' }}
            response={{
              data: [
                {
                  ...sampleListing,
                  transactionType: 'FOR_RENT',
                  rentalPeriod: 'MONTH',
                  priceVnd: '15000000',
                },
              ],
              meta: {
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
              },
            }}
            errorMessage={null}
            locale="en"
          />
        </AppLocaleProvider>,
      );

      expect(
        screen.getByRole('heading', { name: 'Property Search Results' }),
      ).toBeDefined();
      expect(screen.getByTestId('search-approved-badge').textContent).toContain(
        'Approved Listings',
      );
      expect(screen.queryByText('Demo Environment')).toBeNull();
      expect(screen.getByTestId('search-results-count').textContent).toContain(
        '1 results',
      );
      const enResultsList = screen.getByTestId('search-results-list');
      expect(within(enResultsList).getByText('15M VND/month')).toBeDefined();
      expect(within(enResultsList).getByText('Apartment for Rent')).toBeDefined();
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Properties for Rent').length).toBeGreaterThan(0);
    });

    it('renders empty results state with clear filter action when data is empty', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchResultsView
            query={{ province: 'Tỉnh Chưa Có Tin' }}
            response={{
              data: [],
              meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
            }}
            errorMessage={null}
            locale="vi"
          />
        </AppLocaleProvider>,
      );

      const emptyState = screen.getByTestId('search-empty-state');
      expect(emptyState).toBeDefined();
      expect(
        within(emptyState).getByText('Không tìm thấy bất động sản phù hợp'),
      ).toBeDefined();

      const clearBtn = within(emptyState).getByRole('button', { name: 'Xóa bộ lọc' });
      fireEvent.click(clearBtn);
      expect(mockPush).toHaveBeenCalledWith('/vi/bat-dong-san');
    });

    it('renders error state with retry action when API fails', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchResultsView
            query={{}}
            response={null}
            errorMessage="Không thể kết nối đến máy chủ bất động sản."
            locale="vi"
          />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('search-error-state')).toBeDefined();
      expect(
        screen.getByText('Không thể tải kết quả tìm kiếm'),
      ).toBeDefined();
      expect(
        screen.getByText('Không thể kết nối đến máy chủ bất động sản.'),
      ).toBeDefined();

      const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
      fireEvent.click(retryBtn);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('4. Active Filter Tags & URL Manipulation', () => {
    it('displays active tags and removes specific tag when clicking ×', () => {
      const query: PublicListingsQuery = {
        province: 'Hà Nội',
        propertyType: 'HOUSE',
        minPrice: '3000000000',
        maxPrice: '6000000000',
      };

      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <ActiveFilterTags query={query} />
        </AppLocaleProvider>,
      );

      expect(screen.getByText(/Tỉnh\/TP: Hà Nội/)).toBeDefined();
      expect(screen.getByText(/Loại: Nhà ở/)).toBeDefined();
      expect(screen.getByText(/Giá: 3 tỷ - 6 tỷ/)).toBeDefined();

      // Click remove on province tag
      const removeProvinceBtn = screen.getByLabelText(/Remove filter Tỉnh\/TP: Hà Nội/);
      fireEvent.click(removeProvinceBtn);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('propertyType=HOUSE'),
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('province='),
      );
    });

    it('clears all filters when clicking Xóa tất cả', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <ActiveFilterTags query={{ province: 'Đà Nẵng' }} />
        </AppLocaleProvider>,
      );

      const clearAllBtn = screen.getByText('Xóa tất cả');
      fireEvent.click(clearAllBtn);
      expect(mockPush).toHaveBeenCalledWith('/vi/bat-dong-san');
    });
  });

  describe('5. Pagination Component (SearchPagination)', () => {
    it('renders page buttons and preserves query parameters in page links', () => {
      const query: PublicListingsQuery = {
        province: 'Đà Nẵng',
        propertyType: 'APARTMENT',
        page: 2,
      };

      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchPagination page={2} totalPages={5} currentQuery={query} />
        </AppLocaleProvider>,
      );

      const prevLink = screen.getByTestId('pagination-prev');
      expect(prevLink.getAttribute('href')).toContain('page=1');
      expect(prevLink.getAttribute('href')).toContain('province=%C4%90%C3%A0+N%E1%BA%B5ng');
      expect(prevLink.getAttribute('href')).toContain('propertyType=APARTMENT');

      const nextLink = screen.getByTestId('pagination-next');
      expect(nextLink.getAttribute('href')).toContain('page=3');

      const currentBtn = screen.getByTestId('pagination-page-2');
      expect(currentBtn.getAttribute('aria-current')).toBe('page');
    });

    it('disables previous button on first page and next button on last page', () => {
      const { rerender } = render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchPagination page={1} totalPages={3} currentQuery={{}} />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('pagination-prev-disabled')).toBeDefined();

      rerender(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchPagination page={3} totalPages={3} currentQuery={{}} />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('pagination-next-disabled')).toBeDefined();
    });
  });

  describe('6. Desktop Sidebar & Mobile Drawer Interactions', () => {
    it('validates minPrice > maxPrice and prevents invalid filter submission', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchFilterSidebar currentQuery={{}} />
        </AppLocaleProvider>,
      );

      const minPriceInput = screen.getByPlaceholderText('Giá từ');
      const maxPriceInput = screen.getByPlaceholderText('Giá đến');

      fireEvent.change(minPriceInput, { target: { value: '8000000000' } });
      fireEvent.change(maxPriceInput, { target: { value: '3000000000' } });

      const applyBtn = screen.getByRole('button', { name: 'Áp dụng bộ lọc' });
      fireEvent.click(applyBtn);

      expect(
        screen.getByText('Mức giá tối thiểu không thể lớn hơn mức giá tối đa'),
      ).toBeDefined();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('applies valid filters and resets to page 1', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <SearchFilterSidebar currentQuery={{ page: 3 }} />
        </AppLocaleProvider>,
      );

      const provinceInput = screen.getByPlaceholderText('Tất cả tỉnh thành');
      fireEvent.change(provinceInput, { target: { value: 'Bình Dương' } });

      const applyBtn = screen.getByRole('button', { name: 'Áp dụng bộ lọc' });
      fireEvent.click(applyBtn);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('province=B%C3%ACnh+D%C6%B0%C6%A1ng'),
      );
      // Page should be reset to 1
      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('page=3'),
      );
    });

    it('opens and closes mobile filter drawer accessible dialog', () => {
      render(
        <AppLocaleProvider
          locale="vi"
          messages={getDictionary('vi')}
          prefixEnabled={true}
        >
          <MobileFilterDrawer currentQuery={{ province: 'Hà Nội' }} />
        </AppLocaleProvider>,
      );

      const openBtn = screen.getByTestId('mobile-filter-open-button');
      expect(openBtn.textContent).toContain('Bộ lọc (1)');

      fireEvent.click(openBtn);
      expect(screen.getByTestId('mobile-filter-drawer')).toBeDefined();

      const closeBtn = screen.getByTestId('mobile-filter-close-button');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('mobile-filter-drawer')).toBeNull();
    });
  });

  describe('7. SEO Metadata Generation for Search Results', () => {
    it('generates correct canonical, hreflang, and title for /bat-dong-san in Vietnamese and English', () => {
      const localEnv = { NODE_ENV: 'development', PORT: '3000' };

      const viMeta = buildLocalizedPageMetadata(
        'vi',
        '/bat-dong-san',
        localEnv,
      );
      expect(viMeta.title).toBe('Tìm kiếm Bất động sản | Batdongsan');
      expect(viMeta.alternates?.canonical).toBe(
        'http://localhost:3000/vi/bat-dong-san',
      );
      expect(viMeta.alternates?.languages).toEqual({
        vi: 'http://localhost:3000/vi/bat-dong-san',
        en: 'http://localhost:3000/en/bat-dong-san',
        'x-default': 'http://localhost:3000/vi/bat-dong-san',
      });

      const enMeta = buildLocalizedPageMetadata(
        'en',
        '/bat-dong-san',
        localEnv,
      );
      expect(enMeta.title).toBe('Property Search Results | Batdongsan');
      expect(enMeta.alternates?.canonical).toBe(
        'http://localhost:3000/en/bat-dong-san',
      );
      expect(enMeta.alternates?.languages).toEqual({
        vi: 'http://localhost:3000/vi/bat-dong-san',
        en: 'http://localhost:3000/en/bat-dong-san',
        'x-default': 'http://localhost:3000/vi/bat-dong-san',
      });
    });
  });
});
