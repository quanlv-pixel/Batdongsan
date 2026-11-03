import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSearchBox } from '@/components/home/HeroSearchBox';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HeroSearchBox Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders sale/rent tabs, disabled project tab, and all supported filter controls', () => {
    render(<HeroSearchBox />);

    const saleTab = screen.getByRole('tab', { name: /Mua bán/i });
    const rentTab = screen.getByRole('tab', { name: /Cho thuê/i });
    const projectTab = screen.getByRole('tab', { name: /Dự án/i });

    expect(saleTab.getAttribute('aria-selected')).toBe('true');
    expect(rentTab.getAttribute('aria-selected')).toBe('false');
    expect((projectTab as HTMLButtonElement).disabled).toBe(true);
    expect(projectTab.getAttribute('aria-disabled')).toBe('true');

    expect(screen.getByLabelText(/Tỉnh \/ Thành phố/i)).toBeDefined();
    expect(screen.getByLabelText(/Quận \/ Huyện/i)).toBeDefined();
    expect(screen.getByLabelText(/Loại bất động sản/i)).toBeDefined();
    expect(screen.getByLabelText(/Khoảng giá/i)).toBeDefined();
    expect(screen.getByLabelText(/^Diện tích$/i)).toBeDefined();
  });

  it('2. Sale/Rent tab selection switches transactionType and omits blank optional filters on submit', () => {
    render(<HeroSearchBox />);

    const rentTab = screen.getByRole('tab', { name: /Cho thuê/i });
    fireEvent.click(rentTab);
    expect(rentTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Tìm kiếm/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      '/bat-dong-san?transactionType=FOR_RENT',
    );
  });

  it('3. Single propertyType selection and supported filters generate accurate query parameters', () => {
    render(<HeroSearchBox />);

    fireEvent.change(screen.getByLabelText(/Tỉnh \/ Thành phố/i), {
      target: { value: '  TP. Hồ Chí Minh  ' },
    });
    fireEvent.change(screen.getByLabelText(/Quận \/ Huyện/i), {
      target: { value: 'Quận 1' },
    });
    fireEvent.change(screen.getByLabelText(/Loại bất động sản/i), {
      target: { value: 'APARTMENT' },
    });
    fireEvent.change(screen.getByLabelText(/Khoảng giá/i), {
      target: { value: '3b-5b' },
    });
    fireEvent.change(screen.getByLabelText(/^Diện tích$/i), {
      target: { value: '50-80' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tìm kiếm/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const targetUrl = mockPush.mock.calls[0][0] as string;
    expect(targetUrl.startsWith('/bat-dong-san?')).toBe(true);

    const searchParams = new URLSearchParams(targetUrl.split('?')[1]);
    expect(searchParams.get('transactionType')).toBe('FOR_SALE');
    expect(searchParams.get('province')).toBe('TP. Hồ Chí Minh');
    expect(searchParams.get('district')).toBe('Quận 1');
    expect(searchParams.get('propertyType')).toBe('APARTMENT');
    expect(searchParams.get('minPrice')).toBe('3000000000');
    expect(searchParams.get('maxPrice')).toBe('5000000000');
    expect(searchParams.get('minArea')).toBe('50');
    expect(searchParams.get('maxArea')).toBe('80');
  });

  it('4. Disabled project tab cannot be activated or submitted as a project search', () => {
    render(<HeroSearchBox />);

    const projectTab = screen.getByRole('tab', { name: /Dự án/i });
    fireEvent.click(projectTab);

    expect(projectTab.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /Tìm kiếm/i }));
    expect(mockPush).toHaveBeenCalledWith(
      '/bat-dong-san?transactionType=FOR_SALE',
    );
  });

  it('5. Custom min/max price and area inputs are supported and omit blank values', () => {
    render(<HeroSearchBox />);

    fireEvent.change(screen.getByLabelText(/Giá tối thiểu/i), {
      target: { value: '1500000000' },
    });
    fireEvent.change(screen.getByLabelText(/Giá tối đa/i), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByLabelText(/Diện tích tối thiểu/i), {
      target: { value: '65' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tìm kiếm/i }));

    const targetUrl = mockPush.mock.calls[0][0] as string;
    const searchParams = new URLSearchParams(targetUrl.split('?')[1]);
    expect(searchParams.get('transactionType')).toBe('FOR_SALE');
    expect(searchParams.get('minPrice')).toBe('1500000000');
    expect(searchParams.has('maxPrice')).toBe(false);
    expect(searchParams.get('minArea')).toBe('65');
    expect(searchParams.has('maxArea')).toBe(false);
  });
});
