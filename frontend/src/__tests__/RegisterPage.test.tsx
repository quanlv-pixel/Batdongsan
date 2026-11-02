import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RegisterPage from '@/app/register/page';
import * as AuthContextModule from '@/context/AuthContext';
import { ApiClientError } from '@/lib/api-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('RegisterPage Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Form rendering: renders all required inputs and role options', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    expect(screen.getByLabelText(/Họ và tên/i)).toBeDefined();
    expect(screen.getByLabelText(/^Email/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Tối thiểu 8 ký tự')).toBeDefined();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu')).toBeDefined();
    expect(screen.getByText('Tìm mua hoặc thuê')).toBeDefined();
    expect(screen.getByText('Đăng tin bất động sản')).toBeDefined();
    expect(screen.getByText('Hoạt động môi giới')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tạo tài khoản/i })).toBeDefined();
  });

  it('2. Client-side validation: password length under 8 characters shows error', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'Nguyen Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }));
    });

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Mật khẩu phải có độ dài tối thiểu 8 ký tự')).toBeDefined();
  });

  it('3. Client-side validation: password mismatch shows error', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'Nguyen Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu'), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }));
    });

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Mật khẩu và xác nhận mật khẩu không khớp')).toBeDefined();
  });

  it('4. Successful registration: calls register() with whitelisted fields and redirects', async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      id: 'usr_new',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'BUYER',
      registrationIntent: 'OWNER',
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập số điện thoại liên hệ'), {
      target: { value: '0912345678' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu'), {
      target: { value: 'password123' },
    });

    // Select OWNER usage purpose
    const ownerRadio = screen.getByDisplayValue('OWNER');
    fireEvent.click(ownerRadio);

    // Agree to terms
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }));
    });

    // Strict validation: verify phone and confirmPassword are NOT sent to backend!
    expect(mockRegister).toHaveBeenCalledWith({
      fullName: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      registrationIntent: 'OWNER',
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeDefined();
      expect(
        screen.getByText(/Đăng ký tài khoản thành công/i),
      ).toBeDefined();
    });
  });

  it('5. Email already registered (HTTP 409): displays clear conflict error', async () => {
    const mockRegister = vi
      .fn()
      .mockRejectedValue(new ApiClientError(409, 'Email is already registered'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'Existing User' },
    });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/Địa chỉ email này đã được đăng ký/i)).toBeDefined();
    });
  });

  it('6. Phone input UX: renders clear explanatory note that phone is not saved yet', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<RegisterPage />);

    expect(
      screen.getByText(/Thông tin số điện thoại chưa được lưu ở giai đoạn này/i),
    ).toBeDefined();
  });
});
