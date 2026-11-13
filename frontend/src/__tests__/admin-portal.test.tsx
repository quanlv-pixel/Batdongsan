import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLocaleProvider } from '@/i18n';
import AdminPageClient from '@/app/[locale]/admin/AdminPageClient';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ModerationTab } from '@/components/admin/ModerationTab';
import { AdminRequestsTab } from '@/components/admin/AdminRequestsTab';
import { UsersManagementTab } from '@/components/admin/UsersManagementTab';
import { AdminMlsTab } from '@/components/admin/AdminMlsTab';
import { apiClient } from '@/lib/api-client';
import { User, AdminListingItem, AdminContactRequestItem, AdminUserItem, AdminMlsShareItem } from '@/types';

// Navigation mock
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/vi/admin',
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

describe('PHASE 2E-4 — Admin Portal Component Tests', () => {
  const adminUser: User = {
    id: 'usr_admin',
    email: 'admin@batdongsan.test',
    fullName: 'System Administrator',
    role: 'ADMIN',
  };

  const buyerUser: User = {
    id: 'usr_buyer',
    email: 'buyer@test.com',
    fullName: 'Nguyen Buyer',
    role: 'BUYER',
  };

  const ownerUser: User = {
    id: 'usr_owner',
    email: 'owner@test.com',
    fullName: 'Tran Owner',
    role: 'OWNER',
  };

  const agentUser: User = {
    id: 'usr_agent',
    email: 'agent@test.com',
    fullName: 'Le Agent',
    role: 'AGENT',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Access Control & Route Protection
  // ─────────────────────────────────────────────────────────────
  describe('1. Access Control & Route Protection (AdminPageClient)', () => {
    it('redirects unauthenticated visitor to login with returnTo', async () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };

      render(
        <AppLocaleProvider locale="vi">
          <AdminPageClient locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining('/vi/login?returnTo='),
        );
      });
    });

    it('renders 403 Access Denied view for BUYER role without calling admin endpoints', async () => {
      mockAuthState = {
        user: buyerUser,
        isAuthenticated: true,
        isLoading: false,
      };

      const getAdminListingsSpy = vi.spyOn(apiClient, 'getAdminListings');

      render(
        <AppLocaleProvider locale="vi">
          <AdminPageClient locale="vi" />
        </AppLocaleProvider>,
      );

      const deniedCard = screen.getByTestId('admin-access-denied');
      expect(deniedCard).toBeDefined();
      expect(screen.getByText(/Truy cập bị từ chối/i)).toBeDefined();
      expect(getAdminListingsSpy).not.toHaveBeenCalled();
    });

    it('renders 403 Access Denied view for OWNER and AGENT roles', async () => {
      mockAuthState = {
        user: ownerUser,
        isAuthenticated: true,
        isLoading: false,
      };

      const { rerender } = render(
        <AppLocaleProvider locale="vi">
          <AdminPageClient locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('admin-access-denied')).toBeDefined();

      mockAuthState = {
        user: agentUser,
        isAuthenticated: true,
        isLoading: false,
      };

      rerender(
        <AppLocaleProvider locale="vi">
          <AdminPageClient locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('admin-access-denied')).toBeDefined();
    });

    it('renders AdminLayout for authenticated ADMIN user', async () => {
      mockAuthState = {
        user: adminUser,
        isAuthenticated: true,
        isLoading: false,
      };

      vi.spyOn(apiClient, 'getAdminListings').mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      render(
        <AppLocaleProvider locale="vi">
          <AdminPageClient locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('admin-layout')).toBeDefined();
      expect(screen.getByText('Cổng Quản Trị Hệ Thống')).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Admin Layout & Tab Switching
  // ─────────────────────────────────────────────────────────────
  describe('2. Admin Layout & Tab Navigation (AdminLayout)', () => {
    it('renders all 4 tabs and switches active tab on click', async () => {
      vi.spyOn(apiClient, 'getAdminListings').mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      vi.spyOn(apiClient, 'getAdminContactRequests').mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      vi.spyOn(apiClient, 'getAdminUsers').mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      vi.spyOn(apiClient, 'getAdminMlsShares').mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      vi.spyOn(apiClient, 'getAdminAgents').mockResolvedValue([]);

      render(
        <AppLocaleProvider locale="vi">
          <AdminLayout user={adminUser} locale="vi" />
        </AppLocaleProvider>,
      );

      expect(screen.getByTestId('tab-moderation')).toBeDefined();
      expect(screen.getByTestId('tab-requests')).toBeDefined();
      expect(screen.getByTestId('tab-users')).toBeDefined();
      expect(screen.getByTestId('tab-mls')).toBeDefined();

      // Click requests tab
      fireEvent.click(screen.getByTestId('tab-requests'));
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('/vi/admin?tab=requests'),
        { scroll: false },
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Moderation Tab Actions
  // ─────────────────────────────────────────────────────────────
  describe('3. Listing Moderation (ModerationTab)', () => {
    const mockListing: AdminListingItem = {
      id: 'lst_mod_1',
      title: 'Biệt thự Thảo Điền ven sông',
      description: 'Mô tả biệt thự',
      propertyType: 'VILLA',
      transactionType: 'FOR_SALE',
      priceVnd: '45000000000',
      areaSqm: 350,
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 2',
      status: 'PENDING',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      owner: {
        id: 'usr_owner_1',
        fullName: 'Nguyễn Văn Chủ',
        email: 'owner@example.com',
        phone: '0901234567',
      },
      images: [{ id: 'img_1', url: '/villa.jpg', order: 0 }],
      moderationLogs: [],
    };

    it('renders listing queue and approves listing', async () => {
      vi.spyOn(apiClient, 'getAdminListings').mockResolvedValue({
        data: [mockListing],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      const moderateSpy = vi.spyOn(apiClient, 'moderateListing').mockResolvedValue({
        ...mockListing,
        status: 'APPROVED',
      });

      render(
        <AppLocaleProvider locale="vi">
          <ModerationTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Biệt thự Thảo Điền ven sông')).toBeDefined();
      });

      const approveBtn = screen.getByTestId('approve-btn-lst_mod_1');
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(moderateSpy).toHaveBeenCalledWith('lst_mod_1', {
          status: 'APPROVED',
        });
      });
    });

    it('rejects listing with non-empty reason validation', async () => {
      vi.spyOn(apiClient, 'getAdminListings').mockResolvedValue({
        data: [mockListing],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      const moderateSpy = vi.spyOn(apiClient, 'moderateListing').mockResolvedValue({
        ...mockListing,
        status: 'REJECTED',
      });

      render(
        <AppLocaleProvider locale="vi">
          <ModerationTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Biệt thự Thảo Điền ven sông')).toBeDefined();
      });

      // Open reject modal
      fireEvent.click(screen.getByTestId('reject-btn-lst_mod_1'));

      expect(screen.getByText('Từ chối tin đăng')).toBeDefined();

      // Submit without reason -> validation error
      fireEvent.click(screen.getByTestId('confirm-reject-btn'));
      expect(screen.getByText(/Lý do từ chối không được để trống/i)).toBeDefined();
      expect(moderateSpy).not.toHaveBeenCalled();

      // Enter reason and submit
      fireEvent.change(screen.getByTestId('reject-reason-input'), {
        target: { value: 'Hình ảnh không đạt tiêu chuẩn độ nét' },
      });
      fireEvent.click(screen.getByTestId('confirm-reject-btn'));

      await waitFor(() => {
        expect(moderateSpy).toHaveBeenCalledWith('lst_mod_1', {
          status: 'REJECTED',
          reason: 'Hình ảnh không đạt tiêu chuẩn độ nét',
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Contact Requests Dispatch
  // ─────────────────────────────────────────────────────────────
  describe('4. Contact Requests Dispatch (AdminRequestsTab)', () => {
    const mockRequest: AdminContactRequestItem = {
      id: 'req_1',
      listingId: 'lst_1',
      buyerId: 'usr_b1',
      contactConsent: true,
      status: 'NEW',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      message: 'Tôi muốn hẹn xem nhà cuối tuần',
      buyer: {
        id: 'usr_b1',
        fullName: 'Phạm Thị Mua',
        email: 'mua@test.com',
        phone: '0987654321',
      },
      listing: {
        id: 'lst_1',
        title: 'Căn hộ Masteri Thảo Điền',
        propertyType: 'APARTMENT',
        transactionType: 'FOR_SALE',
        priceVnd: '4500000000',
        status: 'APPROVED',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 2',
      },
      assignments: [],
    };

    it('assigns agent to unassigned contact request', async () => {
      vi.spyOn(apiClient, 'getAdminContactRequests').mockResolvedValue({
        data: [mockRequest],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });
      vi.spyOn(apiClient, 'getAdminAgents').mockResolvedValue([
        { id: 'ag_1', fullName: 'Agent Vu', email: 'vu@test.com' },
      ]);

      const assignSpy = vi.spyOn(apiClient, 'assignContactRequest').mockResolvedValue({ id: 'asgn_1' });

      render(
        <AppLocaleProvider locale="vi">
          <AdminRequestsTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Phạm Thị Mua')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('assign-btn-req_1'));

      expect(screen.getByText('Phân công môi giới tiếp nhận')).toBeDefined();

      fireEvent.click(screen.getByTestId('confirm-assign-btn'));

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledWith('req_1', {
          agentId: 'ag_1',
          note: undefined,
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. User Management & Intent Discrepancy
  // ─────────────────────────────────────────────────────────────
  describe('5. User Management (UsersManagementTab)', () => {
    const mockUsers: AdminUserItem[] = [
      {
        id: 'usr_admin',
        email: 'admin@batdongsan.test',
        fullName: 'System Administrator',
        registrationIntent: 'BUYER',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'usr_discrepancy',
        email: 'discrepancy@test.com',
        fullName: 'Nguyen Discrepancy',
        registrationIntent: 'AGENT',
        role: 'BUYER',
        isActive: true,
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
    ];

    it('displays users and highlights intent discrepancy', async () => {
      vi.spyOn(apiClient, 'getAdminUsers').mockResolvedValue({
        data: mockUsers,
        meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });

      render(
        <AppLocaleProvider locale="vi">
          <UsersManagementTab locale="vi" currentAdminId="usr_admin" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Nguyen Discrepancy')).toBeDefined();
      });

      // Discrepancy indicator is rendered for usr_discrepancy
      expect(screen.getByTestId('intent-discrepancy-usr_discrepancy')).toBeDefined();

      // Self-action buttons are disabled for current admin
      const adminRoleBtn = screen.getByTestId('change-role-btn-usr_admin');
      const adminToggleBtn = screen.getByTestId('toggle-status-btn-usr_admin');
      expect((adminRoleBtn as HTMLButtonElement).disabled).toBe(true);
      expect((adminToggleBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('allows updating role for non-self user', async () => {
      vi.spyOn(apiClient, 'getAdminUsers').mockResolvedValue({
        data: mockUsers,
        meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });

      const updateRoleSpy = vi.spyOn(apiClient, 'updateUserRole').mockResolvedValue({
        ...mockUsers[1],
        role: 'AGENT',
      });

      render(
        <AppLocaleProvider locale="vi">
          <UsersManagementTab locale="vi" currentAdminId="usr_admin" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Nguyen Discrepancy')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('change-role-btn-usr_discrepancy'));

      expect(screen.getByText('Cập nhật vai trò người dùng')).toBeDefined();

      fireEvent.change(screen.getByTestId('role-select'), {
        target: { value: 'AGENT' },
      });

      fireEvent.click(screen.getByTestId('confirm-role-btn'));

      await waitFor(() => {
        expect(updateRoleSpy).toHaveBeenCalledWith('usr_discrepancy', {
          role: 'AGENT',
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. MLS Oversight Tab
  // ─────────────────────────────────────────────────────────────
  describe('6. MLS Oversight (AdminMlsTab)', () => {
    const mockShare: AdminMlsShareItem = {
      id: 'sh_1',
      listingId: 'lst_1',
      permission: 'VIEW',
      isActive: true,
      createdAt: '2026-03-01T00:00:00Z',
      listing: {
        id: 'lst_1',
        title: 'Shophouse Vinhomes',
        propertyType: 'COMMERCIAL',
        transactionType: 'FOR_SALE',
        priceVnd: '15000000000',
        status: 'APPROVED',
        province: 'Hà Nội',
        district: 'Gia Lâm',
      },
      grantedBy: {
        id: 'usr_o',
        fullName: 'Chủ Shophouse',
        email: 'chushop@test.com',
      },
      receivedBy: {
        id: 'usr_ag',
        fullName: 'Môi Giới Nhận',
        email: 'moigioi@test.com',
      },
    };

    it('displays MLS share and allows admin revocation', async () => {
      vi.spyOn(apiClient, 'getAdminMlsShares').mockResolvedValue({
        data: [mockShare],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      const revokeSpy = vi.spyOn(apiClient, 'revokeMlsShareAsAdmin').mockResolvedValue({
        id: 'sh_1',
        isActive: false,
      });

      render(
        <AppLocaleProvider locale="vi">
          <AdminMlsTab locale="vi" />
        </AppLocaleProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Shophouse Vinhomes')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('revoke-mls-btn-sh_1'));

      expect(screen.getByText('Thu hồi quyền chia sẻ MLS')).toBeDefined();

      fireEvent.click(screen.getByTestId('confirm-revoke-btn'));

      await waitFor(() => {
        expect(revokeSpy).toHaveBeenCalledWith('sh_1', undefined);
      });
    });
  });
});
