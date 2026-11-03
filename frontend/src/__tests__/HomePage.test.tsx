import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePageShell, LatestListingsSection } from '@/app/[locale]/page';
import * as AuthContextModule from '@/context/AuthContext';
import { PublicListingsResponse } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const samplePublicResponse: PublicListingsResponse = {
  data: [
    {
      id: 'seed_listing_01',
      title: 'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
      description: 'Căn hộ tầng 18 tháp Aqua 1.',
      propertyType: 'APARTMENT',
      transactionType: 'FOR_SALE',
      priceVnd: '7800000000',
      rentalPeriod: null,
      areaSqm: 78.5,
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      status: 'APPROVED',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      images: [
        {
          id: 'seed_listing_01_img_1',
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
          order: 0,
        },
      ],
    },
    {
      id: 'seed_listing_05',
      title: 'Đất nền khu đô thị sinh thái Hòa Xuân ven sông Cẩm Lệ',
      description: 'Lô đất hướng Đông Nam mát mẻ.',
      propertyType: 'LAND',
      transactionType: 'FOR_SALE',
      priceVnd: '3650000000',
      rentalPeriod: null,
      areaSqm: 100,
      province: 'Đà Nẵng',
      district: 'Quận Cẩm Lệ',
      ward: 'Phường Hòa Xuân',
      status: 'APPROVED',
      createdAt: '2026-11-02T08:00:00.000Z',
      updatedAt: '2026-11-02T08:00:00.000Z',
      images: [],
    },
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 6,
    totalPages: 1,
  },
};

describe('HomePage Integration & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Successful public listing response: renders homepage shell and only returned listings', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => samplePublicResponse,
    } as Response);

    const listingsSlot = await LatestListingsSection();
    render(<HomePageShell listingsSlot={listingsSlot} />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/listings?limit=6',
    );

    // Hero, Categories, Truthful Latest Listings heading, Trust Benefits, CTA
    expect(
      screen.getByRole('heading', {
        name: /Tìm bất động sản phù hợp với bạn/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 2, name: /Khám phá bất động sản/i }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { name: /Bất động sản mới nhất/i }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        name: /Nền tảng giao dịch bất động sản an tâm/i,
      }),
    ).toBeDefined();

    // Only returned listings are displayed
    expect(
      screen.getByText(
        'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Đất nền khu đô thị sinh thái Hòa Xuân ven sông Cẩm Lệ',
      ),
    ).toBeDefined();
    expect(screen.getByText('7,8 tỷ')).toBeDefined();
    expect(screen.getByText('3,65 tỷ')).toBeDefined();

    // Hardcoded Stitch sample title must NOT appear
    expect(
      screen.queryByText(
        /Căn hộ Masteri Centre Point 2PN view công viên thoáng mát/i,
      ),
    ).toBeNull();
    // Category grid must not invent listing counts
    expect(screen.queryByText(/\+ tin đăng/i)).toBeNull();
  });

  it('2. Empty results: displays clear Vietnamese empty state when no listings are returned', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        meta: { total: 0, page: 1, limit: 6, totalPages: 0 },
      }),
    } as Response);

    const listingsSlot = await LatestListingsSection();
    render(<HomePageShell listingsSlot={listingsSlot} />);

    expect(screen.getByTestId('listings-empty-state')).toBeDefined();
    expect(
      screen.getByText(/Chưa có tin đăng bất động sản nào/i),
    ).toBeDefined();
  });

  it('3. Backend failure: displays clear Vietnamese error alert without crashing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: 'Internal server error',
      }),
    } as Response);

    const listingsSlot = await LatestListingsSection();
    render(<HomePageShell listingsSlot={listingsSlot} />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(
      screen.getByText(/Không thể tải danh sách bất động sản/i),
    ).toBeDefined();
  });

  it('4. Privacy & status guard: filters out non-APPROVED items and strips private fields', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            ...samplePublicResponse.data[0],
            streetAddress: 'Số 2 Tôn Đức Thắng (Riêng tư)',
            latitude: 10.7812,
            longitude: 106.7061,
            ownerId: 'seed_user_owner_01',
          },
          {
            ...samplePublicResponse.data[1],
            id: 'draft_listing_99',
            title: 'Bản thảo mật không được hiển thị',
            status: 'DRAFT',
          },
        ],
        meta: { total: 2, page: 1, limit: 6, totalPages: 1 },
      }),
    } as Response);

    const listingsSlot = await LatestListingsSection();
    const { container } = render(
      <HomePageShell listingsSlot={listingsSlot} />,
    );

    // Approved listing is shown, draft listing is excluded
    expect(
      screen.getByText(
        'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
      ),
    ).toBeDefined();
    expect(
      screen.queryByText('Bản thảo mật không được hiển thị'),
    ).toBeNull();

    // Private fields must never appear in DOM
    expect(container.textContent).not.toContain('Số 2 Tôn Đức Thắng');
    expect(container.textContent).not.toContain('10.7812');
    expect(container.textContent).not.toContain('seed_user_owner_01');
  });
});
