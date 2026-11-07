import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AppLocaleProvider } from '@/i18n';
import { PropertyGallery } from '@/components/detail/PropertyGallery';
import { PropertyOverview } from '@/components/detail/PropertyOverview';
import { PropertyDescription } from '@/components/detail/PropertyDescription';
import { PropertySpecsTable } from '@/components/detail/PropertySpecsTable';
import { PropertyLocationNotice } from '@/components/detail/PropertyLocationNotice';
import { PropertyContactCard } from '@/components/detail/PropertyContactCard';
import { buildLocalizedListingDetailMetadata } from '@/i18n/metadata';
import {
  fetchPublicListingDetail,
  sanitizePublicListing,
} from '@/lib/public-listings';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { PublicListingSummary, User } from '@/types';

// Mock Next.js navigation
const mockPush = vi.fn();
let mockPathname = '/vi/bat-dong-san/listing_test_01';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AuthContext
let mockAuthState = {
  user: null as User | null,
  isAuthenticated: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const sampleListing: PublicListingSummary = {
  id: 'listing_test_01',
  title: 'Căn hộ Masteri Centre Point 2PN view công viên',
  description:
    'Căn hộ cao cấp thoáng mát, trực diện công viên 36ha.\nBàn giao nội thất cao cấp quốc tế.',
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
  updatedAt: '2026-11-02T10:00:00.000Z',
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
    {
      id: 'img_03',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      order: 3,
    },
    {
      id: 'img_04',
      url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      order: 4,
    },
    {
      id: 'img_05',
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      order: 5,
    },
    {
      id: 'img_06',
      url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      order: 6,
    },
  ],
};

describe('PHASE 2E-2C — Property Detail & Contact Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/vi/bat-dong-san/listing_test_01';
    mockAuthState = {
      user: null,
      isAuthenticated: false,
    };
  });

  describe('1. Data Layer: sanitizePublicListing & fetchPublicListingDetail', () => {
    it('sanitizes public listing fields and sorts images by order', () => {
      const sanitized = sanitizePublicListing({
        ...sampleListing,
        images: [
          { id: '2', url: 'https://img2.jpg', order: 2 },
          { id: '1', url: 'https://img1.jpg', order: 1 },
        ],
      });

      expect(sanitized.id).toBe('listing_test_01');
      expect(sanitized.images).toHaveLength(2);
      expect(sanitized.images[0].order).toBe(1);
      expect(sanitized.images[1].order).toBe(2);
      // Ensures private fields are excluded
      expect('streetAddress' in sanitized).toBe(false);
      expect('latitude' in sanitized).toBe(false);
      expect('longitude' in sanitized).toBe(false);
      expect('ownerId' in sanitized).toBe(false);
    });

    it('returns null when listing is not found (404)', async () => {
      const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 404,
        ok: false,
      } as Response);

      const result = await fetchPublicListingDetail('non_existent_id');
      expect(result).toBeNull();
      globalFetch.mockRestore();
    });

    it('returns null when listing status is not APPROVED', async () => {
      const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ ...sampleListing, status: 'DRAFT' }),
      } as Response);

      const result = await fetchPublicListingDetail('draft_listing');
      expect(result).toBeNull();
      globalFetch.mockRestore();
    });

    it('returns sanitized listing when backend returns 200 APPROVED', async () => {
      const globalFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => sampleListing,
      } as Response);

      const result = await fetchPublicListingDetail('listing_test_01');
      expect(result).not.toBeNull();
      expect(result?.title).toBe(sampleListing.title);
      expect(result?.status).toBe('APPROVED');
      globalFetch.mockRestore();
    });
  });

  describe('2. PropertyGallery Component & Lightbox', () => {
    it('renders primary image and thumbnail cluster without unverified badges', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyGallery images={sampleListing.images} title={sampleListing.title} />
        </AppLocaleProvider>,
      );

      // Unverified and unauthoritative badges are excluded
      expect(screen.queryByText('Tin xác thực')).toBeNull();
      expect(screen.queryByText('Độc quyền')).toBeNull();
      // Has 6 images, so 4th thumbnail slot shows overlay "Xem tất cả 6 ảnh"
      expect(screen.getByText('Xem tất cả 6 ảnh')).toBeDefined();
    });

    it('opens lightbox on click and allows navigation and close via Escape', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyGallery images={sampleListing.images} title={sampleListing.title} />
        </AppLocaleProvider>,
      );

      // Lightbox is closed initially
      expect(screen.queryByRole('dialog')).toBeNull();

      // Click primary image to open lightbox
      const primaryBtn = screen.getByRole('button', {
        name: sampleListing.title,
      });
      fireEvent.click(primaryBtn);

      // Lightbox is now open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(within(dialog).getByText('Ảnh 1 / 6')).toBeDefined();

      // Click next button
      const nextBtn = screen.getByLabelText('Ảnh sau');
      fireEvent.click(nextBtn);
      expect(within(dialog).getByText('Ảnh 2 / 6')).toBeDefined();

      // Click prev button
      const prevBtn = screen.getByLabelText('Ảnh trước');
      fireEvent.click(prevBtn);
      expect(within(dialog).getByText('Ảnh 1 / 6')).toBeDefined();

      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders fallback state when images array is empty', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyGallery images={[]} title="Không có ảnh" />
        </AppLocaleProvider>,
      );

      expect(screen.getByText('Chưa có hình ảnh')).toBeDefined();
    });
  });

  describe('3. PropertyOverview Component', () => {
    it('displays price, price per sqm, location, and 4 core parameters', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyOverview listing={sampleListing} locale="vi" />
        </AppLocaleProvider>,
      );

      // Price: 3,2 tỷ
      expect(screen.getByText('3,2 tỷ')).toBeDefined();
      // Price per sqm: ~ 41 tr/m²
      expect(screen.getByText('~ 41 tr/m²')).toBeDefined();
      // Title
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
        sampleListing.title,
      );
      // Location
      expect(
        screen.getByText('Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh'),
      ).toBeDefined();
      // 4 Core parameters: 78 m², Căn hộ chung cư, Mua bán, Listing Code
      expect(screen.getByText('78 m²')).toBeDefined();
      expect(screen.getByText('Căn hộ chung cư')).toBeDefined();
      expect(screen.getByText('BDS-LISTST01')).toBeDefined();

      // Roadmap save button is disabled with upcoming notice
      const saveBtn = screen.getByRole('button', { name: /Lưu tin/i });
      expect(saveBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByText(/Sắp ra mắt/i)).toBeDefined();
    });

    it('handles clipboard share action and shows feedback', async () => {
      const originalClipboard = navigator.clipboard;
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <AppLocaleProvider locale="vi">
          <PropertyOverview listing={sampleListing} locale="vi" />
        </AppLocaleProvider>,
      );

      const shareBtn = screen.getByRole('button', { name: /Chia sẻ/i });
      fireEvent.click(shareBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
        expect(screen.getByText('Đã sao chép liên kết!')).toBeDefined();
      });

      Object.assign(navigator, { clipboard: originalClipboard });
    });
  });

  describe('4. PropertyDescription Component', () => {
    it('renders paragraphs from multi-line description', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyDescription description={sampleListing.description} />
        </AppLocaleProvider>,
      );

      expect(screen.getByText('Mô tả bất động sản')).toBeDefined();
      expect(
        screen.getByText(/Căn hộ cao cấp thoáng mát, trực diện công viên 36ha\./),
      ).toBeDefined();
      expect(
        screen.getByText(/Bàn giao nội thất cao cấp quốc tế\./),
      ).toBeDefined();
    });
  });

  describe('5. PropertySpecsTable Component', () => {
    it('renders verified specs and preserves data truthfulness', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertySpecsTable listing={sampleListing} locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByText('Thông tin chi tiết')).toBeDefined();
      expect(screen.getByText('Loại hình bất động sản')).toBeDefined();
      expect(screen.getByText('Hình thức giao dịch')).toBeDefined();
      expect(screen.getByText('Diện tích sử dụng')).toBeDefined();
      expect(screen.getByText('Đơn giá ước tính')).toBeDefined();
      expect(screen.getByText('Tỉnh / Thành phố')).toBeDefined();
      expect(screen.getByText('Quận / Huyện')).toBeDefined();
      expect(screen.getByText('Phường / Xã')).toBeDefined();
      expect(screen.getByText('Đã kiểm duyệt (Công khai)')).toBeDefined();

      // Confirms NO fabricated bedrooms, bathrooms, or legal status are shown in the specs table
      expect(screen.queryByText('Số phòng ngủ')).toBeNull();
      expect(screen.queryByText('Số phòng tắm')).toBeNull();
      expect(screen.queryByText('Hướng nhà')).toBeNull();
      expect(screen.queryByText('Sổ hồng sở hữu lâu dài')).toBeNull();
    });
  });

  describe('6. PropertyLocationNotice Component', () => {
    it('displays privacy protection notice without exposing private street address', () => {
      render(
        <AppLocaleProvider locale="vi">
          <PropertyLocationNotice listing={sampleListing} />
        </AppLocaleProvider>,
      );

      expect(screen.getByText('Vị trí khu vực')).toBeDefined();
      expect(screen.getByText(/Nhằm bảo vệ quyền riêng tư/)).toBeDefined();
      expect(screen.getByText(/Bán kính ước tính ~500m/)).toBeDefined();
      expect(
        screen.getByText('Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh'),
      ).toBeDefined();
    });
  });

  describe('7. PropertyContactCard: Auth Flows & Submissions', () => {
    it('shows login prompt with returnTo link when unauthenticated', () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
      };

      render(
        <AppLocaleProvider locale="vi">
          <PropertyContactCard listing={sampleListing} />
        </AppLocaleProvider>,
      );

      expect(screen.getByText('Quan tâm bất động sản này?')).toBeDefined();
      expect(
        screen.getByText(
          'Vui lòng đăng nhập để gửi yêu cầu liên hệ trực tiếp đến chuyên viên tư vấn phụ trách.',
        ),
      ).toBeDefined();

      const loginLink = screen.getByRole('link', {
        name: /Đăng nhập để gửi yêu cầu/i,
      });
      expect(loginLink.getAttribute('href')).toContain(
        'returnTo=%2Fvi%2Fbat-dong-san%2Flisting_test_01',
      );
    });

    it('shows admin notice when logged-in user is ADMIN', () => {
      mockAuthState = {
        user: {
          id: 'admin_01',
          fullName: 'System Admin',
          email: 'admin@batdongsan.vn',
          role: 'ADMIN',
        },
        isAuthenticated: true,
      };

      render(
        <AppLocaleProvider locale="vi">
          <PropertyContactCard listing={sampleListing} />
        </AppLocaleProvider>,
      );

      expect(
        screen.getByText(
          'Tài khoản Quản trị viên không thể tạo yêu cầu liên hệ khách hàng.',
        ),
      ).toBeDefined();
      expect(
        screen.queryByRole('button', { name: /Gửi yêu cầu liên hệ/i }),
      ).toBeNull();
    });

    it('allows authenticated buyer to submit contact request with consent', async () => {
      mockAuthState = {
        user: {
          id: 'buyer_01',
          fullName: 'Nguyễn Văn An',
          email: 'an.nguyen@example.com',
          role: 'BUYER',
        },
        isAuthenticated: true,
      };

      const createRequestSpy = vi
        .spyOn(apiClient, 'createContactRequest')
        .mockResolvedValueOnce({
          id: 'req_12345678',
          listingId: sampleListing.id,
          buyerId: 'buyer_01',
          message: 'Tôi muốn hẹn xem nhà thực tế.',
          contactConsent: true,
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          assignedAgentId: 'agent_01',
        });

      render(
        <AppLocaleProvider locale="vi">
          <PropertyContactCard listing={sampleListing} />
        </AppLocaleProvider>,
      );

      // Verify user banner
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('an.nguyen@example.com')).toBeDefined();

      // Submit button is disabled when consent checkbox is unchecked
      const submitBtn = screen.getByRole('button', {
        name: /Gửi yêu cầu liên hệ/i,
      });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Enter message
      const textarea = screen.getByPlaceholderText(/Tôi muốn tìm hiểu thêm/i);
      fireEvent.change(textarea, {
        target: { value: 'Tôi muốn hẹn xem nhà thực tế.' },
      });
      expect(screen.getByText('29/1000')).toBeDefined();

      // Check consent checkbox
      const consentCheckbox = screen.getByLabelText(/Tôi đồng ý để nhân viên tư vấn liên hệ/i);
      fireEvent.click(consentCheckbox);

      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      // Submit form
      fireEvent.submit(submitBtn.closest('form')!);

      await waitFor(() => {
        expect(createRequestSpy).toHaveBeenCalledWith({
          listingId: sampleListing.id,
          message: 'Tôi muốn hẹn xem nhà thực tế.',
          contactConsent: true,
        });
        expect(screen.getByText('Gửi yêu cầu thành công!')).toBeDefined();
        expect(screen.getByText(/REQ_1234/)).toBeDefined();
      });

      createRequestSpy.mockRestore();
    });

    it('handles self-listing rejection error (400)', async () => {
      mockAuthState = {
        user: {
          id: 'owner_01',
          fullName: 'Trần Thị Chủ Nhà',
          email: 'chu.nha@example.com',
          role: 'OWNER',
        },
        isAuthenticated: true,
      };

      const createRequestSpy = vi
        .spyOn(apiClient, 'createContactRequest')
        .mockRejectedValueOnce(
          new ApiClientError(400, 'Cannot create a contact request for your own listing'),
        );

      render(
        <AppLocaleProvider locale="vi">
          <PropertyContactCard listing={sampleListing} />
        </AppLocaleProvider>,
      );

      const consentCheckbox = screen.getByLabelText(/Tôi đồng ý để nhân viên tư vấn liên hệ/i);
      fireEvent.click(consentCheckbox);

      const submitBtn = screen.getByRole('button', {
        name: /Gửi yêu cầu liên hệ/i,
      });
      fireEvent.submit(submitBtn.closest('form')!);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Bạn không thể gửi yêu cầu liên hệ cho bất động sản của chính mình.',
          ),
        ).toBeDefined();
      });

      createRequestSpy.mockRestore();
    });
  });

  describe('8. Dynamic SEO Metadata Generation', () => {
    it('builds localized metadata with title, canonical, alternates, and OpenGraph', () => {
      const meta = buildLocalizedListingDetailMetadata(
        'vi',
        sampleListing.id,
        sampleListing,
        { NEXT_PUBLIC_SITE_URL: 'https://batdongsan.vn' },
      );

      expect(meta.title).toBe(`${sampleListing.title} | Batdongsan`);
      expect(meta.description).toContain(
        'Căn hộ cao cấp thoáng mát, trực diện công viên 36ha.',
      );
      expect((meta.alternates?.canonical as string)).toBe(
        'https://batdongsan.vn/vi/bat-dong-san/listing_test_01',
      );
      expect(meta.alternates?.languages?.['vi']).toBe(
        'https://batdongsan.vn/vi/bat-dong-san/listing_test_01',
      );
      expect(meta.alternates?.languages?.['en']).toBe(
        'https://batdongsan.vn/en/bat-dong-san/listing_test_01',
      );
      expect(meta.openGraph?.locale).toBe('vi_VN');
      const og = meta.openGraph as
        | { images?: Array<{ url: string }> }
        | undefined;
      expect(og?.images?.[0]?.url).toBe(sampleListing.images[0].url);
    });

    it('builds localized metadata for English locale', () => {
      const meta = buildLocalizedListingDetailMetadata(
        'en',
        sampleListing.id,
        sampleListing,
        { NEXT_PUBLIC_SITE_URL: 'https://batdongsan.vn' },
      );

      expect(meta.title).toBe(`${sampleListing.title} | Batdongsan`);
      expect((meta.alternates?.canonical as string)).toBe(
        'https://batdongsan.vn/en/bat-dong-san/listing_test_01',
      );
      expect(meta.openGraph?.locale).toBe('en_US');
    });

    it('handles not-found listing metadata gracefully', () => {
      const meta = buildLocalizedListingDetailMetadata(
        'vi',
        'invalid_id',
        null,
        { NEXT_PUBLIC_SITE_URL: 'https://batdongsan.vn' },
      );

      expect(meta.title).toBe('Không tìm thấy bất động sản | Batdongsan');
      expect(meta.description).toContain('không tồn tại hoặc chưa được duyệt');
    });
  });
});
