import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginPage from '@/app/[locale]/login/page';
import * as AuthContextModule from '@/context/AuthContext';
import { ApiClientError } from '@/lib/api-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Form rendering: renders email, password inputs, submit button, and links', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Nhập mật khẩu')).toBeDefined();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeDefined();
    expect(screen.getByText('Quên mật khẩu?')).toBeDefined();
    expect(screen.getByText('Đăng ký ngay')).toBeDefined();
  });

  it('2. Password visibility toggle works', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('Nhập mật khẩu') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByRole('button', { name: /Ẩn mật khẩu/i });
    fireEvent.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('3. Successful login calls login() and redirects to home page', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: 'usr_1',
      email: 'buyer@test.com',
      fullName: 'Buyer User',
      role: 'BUYER',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email của bạn'), {
      target: { value: 'buyer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), {
      target: { value: 'password123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'buyer@test.com',
      password: 'password123',
      rememberMe: false,
    });
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('4. Invalid credentials shows clear Vietnamese error message', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new ApiClientError(401, 'Invalid credentials'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email của bạn'), {
      target: { value: 'buyer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), {
      target: { value: 'wrongpassword' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Email hoặc mật khẩu không chính xác')).toBeDefined();
    });
  });

  it('5. Forgot password modal: opens and clearly explains GAP-03 deferred notice', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    fireEvent.click(screen.getByText('Quên mật khẩu?'));
    expect(screen.getByText('Khôi phục mật khẩu')).toBeDefined();
    expect(screen.getByText(/Tính năng đang trong lộ trình phát triển/i)).toBeDefined();

    fireEvent.click(screen.getByText('Đã hiểu'));
    expect(screen.queryByText('Khôi phục mật khẩu')).toBeNull();
  });

  it('6. Remember-me checkbox toggles state and passes rememberMe: true to login()', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: 'usr_1',
      email: 'buyer@test.com',
      fullName: 'Buyer User',
      role: 'BUYER',
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginPage />);

    // Check that 15-minute validity note is rendered
    expect(
      screen.getByText(/Phiên đăng nhập hiện có hiệu lực tối đa 15 phút/i),
    ).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email của bạn'), {
      target: { value: 'buyer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), {
      target: { value: 'password123' },
    });

    // Toggle remember-me checkbox
    const rememberCheckbox = screen.getByRole('checkbox');
    fireEvent.click(rememberCheckbox);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'buyer@test.com',
      password: 'password123',
      rememberMe: true,
    });
  });
});
