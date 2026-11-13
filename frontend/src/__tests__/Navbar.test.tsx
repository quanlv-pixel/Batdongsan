import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Navbar } from '@/components/common/Navbar';
import * as AuthContextModule from '@/context/AuthContext';
import { User } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Navbar Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Visitor state: renders Login and Register actions', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getAllByText('Đăng nhập').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đăng ký').length).toBeGreaterThan(0);
    expect(screen.queryByText('Đăng xuất')).toBeNull();
  });

  it('2. BUYER state: displays full name and "Người mua" badge', () => {
    const mockUser: User = {
      id: 'usr_buyer',
      email: 'buyer@test.com',
      fullName: 'Nguyen Buyer',
      role: 'BUYER',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getAllByText('Nguyen Buyer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Người mua').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đăng xuất').length).toBeGreaterThan(0);
  });

  it('3. OWNER state: displays "Chủ nhà" badge', () => {
    const mockUser: User = {
      id: 'usr_owner',
      email: 'owner@test.com',
      fullName: 'Tran Owner',
      role: 'OWNER',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getAllByText('Chủ nhà').length).toBeGreaterThan(0);
  });

  it('4. AGENT state: displays "Môi giới" badge', () => {
    const mockUser: User = {
      id: 'usr_agent',
      email: 'agent@test.com',
      fullName: 'Le Agent',
      role: 'AGENT',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getAllByText('Môi giới').length).toBeGreaterThan(0);
  });

  it('5. ADMIN state: displays "Quản trị viên" badge', () => {
    const mockUser: User = {
      id: 'usr_admin',
      email: 'admin@test.com',
      fullName: 'Admin User',
      role: 'ADMIN',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getAllByText('Quản trị viên').length).toBeGreaterThan(0);
  });

  it('6. Logout interaction: calls logout handler', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockUser: User = {
      id: 'usr_1',
      email: 'user@test.com',
      fullName: 'User Test',
      role: 'BUYER',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    const logoutButtons = screen.getAllByText('Đăng xuất');
    await act(async () => {
      logoutButtons[0].click();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('7. Public navigation links: renders Trang chủ, Mua bán, and Cho thuê with valid hrefs', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    const homeLink = screen.getByRole('link', { name: 'Trang chủ' });
    const saleLink = screen.getByRole('link', { name: 'Mua bán' });
    const rentLink = screen.getByRole('link', { name: 'Cho thuê' });

    expect(homeLink.getAttribute('href')).toBe('/');
    expect(saleLink.getAttribute('href')).toBe(
      '/bat-dong-san?transactionType=FOR_SALE',
    );
    expect(rentLink.getAttribute('href')).toBe(
      '/bat-dong-san?transactionType=FOR_RENT',
    );
  });

  it('8. Route integrity: does not render dead links or unimplemented nav items', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = render(<Navbar />);
    const anchors = Array.from(container.querySelectorAll('a'));

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
    }

    expect(screen.queryByText('Dự án')).toBeNull();
    expect(screen.queryByText('Tin tức')).toBeNull();
  });

  it('9. ADMIN state: renders admin portal link with valid href', () => {
    const mockUser: User = {
      id: 'usr_admin',
      email: 'admin@test.com',
      fullName: 'System Administrator',
      role: 'ADMIN',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Navbar />);

    const adminLink = screen.getByTestId('navbar-admin-link');
    expect(adminLink).toBeDefined();
    expect(adminLink.getAttribute('href')).toBe('/admin');
  });
});
