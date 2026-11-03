import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingCard } from '@/components/home/ListingCard';
import { PublicListingSummary } from '@/types';

const mockApprovedSaleListing: PublicListingSummary = {
  id: 'seed_listing_01',
  title: 'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
  description: 'Căn hộ tầng 18 tháp Aqua 1, đầy đủ nội thất.',
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
      id: 'img_1',
      url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      order: 0,
    },
    {
      id: 'img_2',
      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      order: 1,
    },
  ],
};

describe('ListingCard Component Tests', () => {
  it('1. Renders actual title, price, area, administrative location, date, and image', () => {
    render(<ListingCard listing={mockApprovedSaleListing} />);

    expect(
      screen.getByText(
        'Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River',
      ),
    ).toBeDefined();
    expect(screen.getByText('7,8 tỷ')).toBeDefined();
    expect(screen.getByText('~ 99 tr/m²')).toBeDefined();
    expect(screen.getByText('78,5 m²')).toBeDefined();
    expect(screen.getByText('Căn hộ chung cư')).toBeDefined();
    expect(
      screen.getByText('Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'),
    ).toBeDefined();
    expect(screen.getByText('01/11/2026')).toBeDefined();
    expect(screen.getByText('2 ảnh')).toBeDefined();

    const img = screen.getByRole('img', {
      name: mockApprovedSaleListing.title,
    }) as HTMLImageElement;
    expect(img.src).toContain('images.unsplash.com');

    const titleLink = screen.getByRole('link', {
      name: mockApprovedSaleListing.title,
    });
    expect(titleLink.getAttribute('href')).toBe(
      '/bat-dong-san/seed_listing_01',
    );
  });

  it('2. Renders fallback UI when images array is empty or image fails to load', () => {
    const listingWithoutImages: PublicListingSummary = {
      ...mockApprovedSaleListing,
      id: 'seed_listing_no_img',
      images: [],
    };

    const { unmount } = render(<ListingCard listing={listingWithoutImages} />);
    expect(screen.getByTestId('listing-image-fallback')).toBeDefined();
    expect(screen.getByText('Chưa có hình ảnh')).toBeDefined();
    unmount();

    // Also verify runtime image load error triggers fallback
    render(<ListingCard listing={mockApprovedSaleListing} />);
    const img = screen.getByRole('img', {
      name: mockApprovedSaleListing.title,
    });
    fireEvent.error(img);
    expect(screen.getByTestId('listing-image-fallback')).toBeDefined();
  });

  it('3. Does not fabricate bedroom, bathroom, legal status, or featured badges', () => {
    const { container } = render(
      <ListingCard listing={mockApprovedSaleListing} />,
    );

    // Must not render fake bedroom/bathroom icons or "Nổi bật" badge
    expect(screen.queryByText('Nổi bật')).toBeNull();
    expect(screen.queryByText(/PT/)).toBeNull();
    expect(screen.queryByText(/phòng ngủ/i)).toBeNull();
    expect(container.textContent).not.toContain('bed');
    expect(container.textContent).not.toContain('bathtub');
  });

  it('4. Formats FOR_RENT listings with rentalPeriod and omits price-per-sqm badge', () => {
    const rentalListing: PublicListingSummary = {
      ...mockApprovedSaleListing,
      id: 'seed_listing_03',
      title: 'Căn hộ dịch vụ studio hiện đại gần Hồ Tây',
      transactionType: 'FOR_RENT',
      priceVnd: '12000000',
      rentalPeriod: 'MONTH',
      areaSqm: 42,
    };

    render(<ListingCard listing={rentalListing} />);

    expect(screen.getByText('12 triệu/tháng')).toBeDefined();
    expect(screen.getByText('Thuê căn hộ')).toBeDefined();
    expect(screen.queryByText(/tr\/m²/)).toBeNull();
  });
});
