import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLocaleProvider } from '@/i18n';
import WorkspacePageClient from '@/app/[locale]/quan-ly/WorkspacePageClient';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { MlsTab } from '@/components/workspace/MlsTab';
import { AssignedLeadsTab } from '@/components/workspace/AssignedLeadsTab';
import { MyListingsTab } from '@/components/workspace/MyListingsTab';
import { InquiriesTab } from '@/components/workspace/InquiriesTab';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';
import {
  MyListingItem,
  AssignedLeadItem,
  ReceivedMlsShareItem,
  InquiryItem,
} from '@/types/workspace';

// Navigation mock
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/vi/quan-ly',
  useSearchParams: () => mockSearchParams,
}));

// AuthContext mock
let mockAuthState = {
  user: null as User | null,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Mock Image component
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

describe('PHASE 2E-3 — Owner & Agent Workspaces Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };

    // Default API mocks
    vi.spyOn(apiClient, 'getMyListings').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.spyOn(apiClient, 'getAssignedContactRequests').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.spyOn(apiClient, 'getReceivedMlsShares').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.spyOn(apiClient, 'getInquiriesForOwnedListings').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  describe('1. Route Protection & Role Guard (WorkspacePageClient)', () => {
    it('redirects unauthenticated visitor to login with safe returnTo', () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };

      render(
        <AppLocaleProvider locale="vi">
          <WorkspacePageClient locale="vi" />
        </AppLocaleProvider>,
      );

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('/vi/login?returnTo=%2Fvi%2Fquan-ly'),
      );
    });

    it('displays access restriction notice for BUYER role', () => {
      mockAuthState = {
        user: {
          id: 'user_buyer_01',
          fullName: 'Nguyễn Khách Mua',
          email: 'buyer@example.test',
          role: 'BUYER',
        },
        isAuthenticated: true,
        isLoading: false,
      };

      render(
        <AppLocaleProvider locale="vi">
          <WorkspacePageClient locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('buyer-access-notice')).toBeDefined();
      expect(screen.getByText('Khu vực dành cho Đối tác')).toBeDefined();
      expect(screen.getByText('Quay lại trang chủ')).toBeDefined();
    });
  });

  describe('2. Role-Based Navigation & Tab Access (WorkspaceLayout)', () => {
    it('renders only OWNER-permitted tabs for OWNER role', () => {
      const ownerUser: User = {
        id: 'user_owner_01',
        fullName: 'Trần Văn Chủ Nhà',
        email: 'owner@example.test',
        role: 'OWNER',
      };

      render(
        <AppLocaleProvider locale="vi">
          <WorkspaceLayout user={ownerUser} locale="vi" />
        </AppLocaleProvider>,
      );

      // OWNER should see "Tin đăng của tôi" and "Yêu cầu tư vấn nhận được"
      expect(screen.getByTestId('tab-my-listings')).toBeDefined();
      expect(screen.getByTestId('tab-inquiries')).toBeDefined();

      // OWNER must NOT see "Khách hàng của tôi" or "Kho tin MLS"
      expect(screen.queryByTestId('tab-leads')).toBeNull();
      expect(screen.queryByTestId('tab-mls')).toBeNull();
    });

    it('renders all 4 operational tabs for AGENT role', () => {
      const agentUser: User = {
        id: 'user_agent_a',
        fullName: 'Lê Môi Giới A',
        email: 'agent_a@example.test',
        role: 'AGENT',
      };

      render(
        <AppLocaleProvider locale="vi">
          <WorkspaceLayout user={agentUser} locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('tab-my-listings')).toBeDefined();
      expect(screen.getByTestId('tab-leads')).toBeDefined();
      expect(screen.getByTestId('tab-mls')).toBeDefined();
      expect(screen.getByTestId('tab-inquiries')).toBeDefined();
    });

    it('switches tab and updates URL shallowly when clicking a tab', () => {
      const agentUser: User = {
        id: 'user_agent_a',
        fullName: 'Lê Môi Giới A',
        email: 'agent_a@example.test',
        role: 'AGENT',
      };

      render(
        <AppLocaleProvider locale="vi">
          <WorkspaceLayout user={agentUser} locale="vi" />
        </AppLocaleProvider>,
      );

      const mlsTabButton = screen.getByTestId('tab-mls');
      fireEvent.click(mlsTabButton);

      expect(mockReplace).toHaveBeenCalledWith('/vi/quan-ly?tab=mls', { scroll: false });
    });
  });

  describe('3. MLS Collaboration & Permission Allowlists (MlsTab)', () => {
    const mockMlsShares: ReceivedMlsShareItem[] = [
      {
        id: 'share_view_01',
        permission: 'VIEW',
        expiresAt: null,
        createdAt: '2026-11-05T10:00:00.000Z',
        listing: {
          id: 'listing_01',
          title: 'Biệt thự Thảo Điền Quận 2',
          description: 'Khu biệt thự ven sông cao cấp',
          propertyType: 'VILLA',
          transactionType: 'FOR_SALE',
          priceVnd: '45000000000',
          rentalPeriod: null,
          areaSqm: 450,
          province: 'TP. Hồ Chí Minh',
          district: 'Quận 2',
          ward: 'Phường Thảo Điền',
          // streetAddress is omitted for VIEW
          status: 'APPROVED',
          createdAt: '2026-11-01T10:00:00.000Z',
          updatedAt: '2026-11-01T10:00:00.000Z',
          images: [{ id: 'img_01', url: 'https://images.unsplash.com/test.jpg', order: 1 }],
          owner: {
            id: 'owner_01',
            fullName: 'Chủ Biệt Thự',
          },
        },
      },
      {
        id: 'share_manage_02',
        permission: 'MANAGE',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: '2026-11-06T10:00:00.000Z',
        listing: {
          id: 'listing_02',
          title: 'Nhà phố Đống Đa Hà Nội',
          description: 'Mặt tiền kinh doanh sầm uất',
          propertyType: 'HOUSE',
          transactionType: 'FOR_SALE',
          priceVnd: '12000000000',
          rentalPeriod: null,
          areaSqm: 80,
          province: 'Hà Nội',
          district: 'Quận Đống Đa',
          ward: 'Phường Ô Chợ Dừa',
          streetAddress: 'Số 88 Phố Hoàng Cầu',
          latitude: 21.018,
          longitude: 105.823,
          status: 'APPROVED',
          createdAt: '2026-11-02T10:00:00.000Z',
          updatedAt: '2026-11-02T10:00:00.000Z',
          images: [],
          owner: {
            id: 'owner_02',
            fullName: 'Chủ Nhà Phố',
          },
        },
      },
    ];

    it('enforces VIEW vs MANAGE permission allowlists on displayed items', async () => {
      vi.spyOn(apiClient, 'getReceivedMlsShares').mockResolvedValueOnce({
        data: mockMlsShares,
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      render(
        <AppLocaleProvider locale="vi">
          <MlsTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('mls-share-share_view_01')).toBeDefined();
        expect(screen.getByTestId('mls-share-share_manage_02')).toBeDefined();
      });

      // Check VIEW share: badge says Quyền Xem (VIEW) and exact street address is hidden
      const viewBadge = screen.getByTestId('mls-badge-share_view_01');
      expect(viewBadge.textContent).toContain('Quyền Xem (VIEW)');
      expect(screen.getByText(/Địa chỉ chính xác được bảo mật theo quyền Xem/)).toBeDefined();

      // Check MANAGE share: badge says Đồng quản lý (MANAGE) and exact address is visible
      const manageBadge = screen.getByTestId('mls-badge-share_manage_02');
      expect(manageBadge.textContent).toContain('Đồng quản lý (MANAGE)');
      expect(screen.getByText(/Số 88 Phố Hoàng Cầu/)).toBeDefined();
      expect(screen.getByText(/Bạn có quyền xem địa chỉ thực tế phục vụ dẫn khách/)).toBeDefined();
    });
  });

  describe('4. Lead Handling & Consent Privacy (AssignedLeadsTab)', () => {
    const mockAssignedLeads: AssignedLeadItem[] = [
      {
        id: 'lead_with_consent',
        listingId: 'listing_01',
        buyerId: 'buyer_01',
        message: 'Tôi muốn hẹn đi xem nhà vào sáng Chủ Nhật.',
        contactConsent: true,
        status: 'IN_PROGRESS',
        createdAt: '2026-11-06T08:00:00.000Z',
        updatedAt: '2026-11-06T08:30:00.000Z',
        buyer: {
          id: 'buyer_01',
          fullName: 'Nguyễn Văn Mua',
          phone: '0901234567',
          email: 'buyer@example.test',
        },
        listing: {
          id: 'listing_01',
          title: 'Căn hộ Masteri Centre Point',
          description: 'Mô tả chi tiết',
          propertyType: 'APARTMENT',
          transactionType: 'FOR_SALE',
          priceVnd: '3500000000',
          rentalPeriod: null,
          areaSqm: 72,
          province: 'TP. Hồ Chí Minh',
          district: 'TP. Thủ Đức',
          ward: 'Phường Long Bình',
          status: 'APPROVED',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          images: [],
        },
      },
      {
        id: 'lead_without_consent',
        listingId: 'listing_02',
        buyerId: 'buyer_02',
        message: 'Cần tư vấn thêm về pháp lý sổ hồng.',
        contactConsent: false,
        status: 'NEW',
        createdAt: '2026-11-07T08:00:00.000Z',
        updatedAt: '2026-11-07T08:00:00.000Z',
        buyer: {
          id: 'buyer_02',
          fullName: 'Phạm Thị Khách',
        },
        listing: {
          id: 'listing_02',
          title: 'Nhà riêng Ba Đình',
          description: 'Mô tả chi tiết',
          propertyType: 'HOUSE',
          transactionType: 'FOR_SALE',
          priceVnd: '6000000000',
          rentalPeriod: null,
          areaSqm: 55,
          province: 'Hà Nội',
          district: 'Quận Ba Đình',
          ward: 'Phường Kim Mã',
          status: 'APPROVED',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          images: [],
        },
      },
    ];

    it('protects buyer contact info according to contactConsent', async () => {
      vi.spyOn(apiClient, 'getAssignedContactRequests').mockResolvedValueOnce({
        data: mockAssignedLeads,
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      render(
        <AppLocaleProvider locale="vi">
          <AssignedLeadsTab />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('assigned-lead-card-lead_with_consent')).toBeDefined();
        expect(screen.getByTestId('assigned-lead-card-lead_without_consent')).toBeDefined();
      });

      // Lead with consent: displays phone and email
      expect(screen.getByText('0901234567')).toBeDefined();
      expect(screen.getByText('buyer@example.test')).toBeDefined();

      // Lead without consent: displays privacy notice
      expect(screen.getAllByText('Khách hàng không chia sẻ thông tin liên hệ ngoài').length).toBeGreaterThan(0);
    });

    it('successfully transitions lead status to COMPLETED', async () => {
      vi.spyOn(apiClient, 'getAssignedContactRequests').mockResolvedValueOnce({
        data: mockAssignedLeads,
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });
      const updateStatusSpy = vi.spyOn(apiClient, 'updateContactRequestStatus').mockResolvedValueOnce({
        id: 'lead_with_consent',
        listingId: 'listing_01',
        buyerId: 'buyer_01',
        assignedAgentId: 'user_agent_a',
        message: null,
        contactConsent: true,
        status: 'COMPLETED',
        createdAt: '2026-11-06T08:00:00.000Z',
      });

      render(
        <AppLocaleProvider locale="vi">
          <AssignedLeadsTab />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('complete-lead-btn-lead_with_consent')).toBeDefined();
      });

      const completeButton = screen.getByTestId('complete-lead-btn-lead_with_consent');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(updateStatusSpy).toHaveBeenCalledWith(
          'lead_with_consent',
          'COMPLETED',
          undefined,
        );
      });
    });
  });

  describe('5. Owner Listings & Resubmission (MyListingsTab)', () => {
    const mockListings: MyListingItem[] = [
      {
        id: 'listing_rejected_01',
        title: 'Căn hộ chung cư cao cấp D’Capitale Trần Duy Hưng',
        description: 'Căn hộ tầng trung view hồ điều hòa Nhân Chính',
        propertyType: 'APARTMENT',
        transactionType: 'FOR_SALE',
        priceVnd: '4500000000',
        rentalPeriod: null,
        areaSqm: 75,
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Phường Trung Hòa',
        streetAddress: '119 Trần Duy Hưng',
        latitude: null,
        longitude: null,
        status: 'REJECTED',
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-02T10:00:00.000Z',
        images: [],
        moderationLogs: [
          {
            id: 'mod_01',
            fromStatus: 'PENDING',
            toStatus: 'REJECTED',
            reason: 'Hình ảnh đính kèm chưa đạt tiêu chuẩn rõ nét, vui lòng bổ sung ảnh thực tế.',
            createdAt: '2026-11-02T10:00:00.000Z',
          },
        ],
      },
    ];

    it('renders rejection reason alert and allows resubmission', async () => {
      vi.spyOn(apiClient, 'getMyListings').mockResolvedValueOnce({
        data: mockListings,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
      const submitSpy = vi.spyOn(apiClient, 'submitListing').mockResolvedValueOnce({
        id: 'listing_rejected_01',
        status: 'PENDING',
        message: 'Tin đăng đã được gửi duyệt thành công.',
      });

      render(
        <AppLocaleProvider locale="vi">
          <MyListingsTab />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('my-listing-card-listing_rejected_01')).toBeDefined();
      });

      // Rejection alert with reason
      expect(
        screen.getByText(/Hình ảnh đính kèm chưa đạt tiêu chuẩn rõ nét, vui lòng bổ sung ảnh thực tế./),
      ).toBeDefined();

      // Submit button
      const submitButton = screen.getByTestId('submit-listing-btn-listing_rejected_01');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith('listing_rejected_01');
      });
    });
  });

  describe('6. Owner Inquiries (InquiriesTab)', () => {
    const mockInquiries: InquiryItem[] = [
      {
        id: 'inq_01',
        listingId: 'listing_01',
        status: 'NEW',
        createdAt: '2026-11-08T09:00:00.000Z',
        updatedAt: '2026-11-08T09:00:00.000Z',
        listing: {
          id: 'listing_01',
          title: 'Nhà phố Đống Đa',
          description: 'Mô tả chi tiết',
          propertyType: 'HOUSE',
          transactionType: 'FOR_SALE',
          priceVnd: '12000000000',
          rentalPeriod: null,
          areaSqm: 80,
          province: 'Hà Nội',
          district: 'Quận Đống Đa',
          ward: 'Phường Ô Chợ Dừa',
          status: 'APPROVED',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          images: [],
        },
      },
    ];

    it('renders received inquiries for owner listings', async () => {
      vi.spyOn(apiClient, 'getInquiriesForOwnedListings').mockResolvedValueOnce({
        data: mockInquiries,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      render(
        <AppLocaleProvider locale="vi">
          <InquiriesTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('inquiry-item-inq_01')).toBeDefined();
      });

      expect(screen.getByText('Nhà phố Đống Đa')).toBeDefined();
      expect(screen.getByText('Mới tạo / Chờ xử lý')).toBeDefined();
    });
  });
});
