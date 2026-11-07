import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout, refreshUser } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-email">{user ? user.email : 'none'}</div>
      <div data-testid="user-role">{user ? user.role : 'none'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login({ email: 'user@example.com', password: 'password123' })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={() => refreshUser()}>
        Refresh
      </button>
    </div>
  );
}

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Initial mount with active session: hydrates user and sets isAuthenticated = true', async () => {
    const mockUser: User = {
      id: 'usr_1',
      email: 'buyer@example.com',
      fullName: 'Nguyen Van A',
      role: 'BUYER',
    };

    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({ user: mockUser });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('buyer@example.com');
    expect(screen.getByTestId('user-role').textContent).toBe('BUYER');
  });

  it('2. Initial mount with no active session (guest): sets isAuthenticated = false, user = null', async () => {
    vi.spyOn(apiClient, 'getMe').mockRejectedValueOnce(new Error('Unauthenticated'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  it('3. Successful login: updates user state without exposing raw JWT token', async () => {
    vi.spyOn(apiClient, 'getMe').mockRejectedValueOnce(new Error('No session'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    const loggedInUser: User = {
      id: 'usr_owner_1',
      email: 'owner@example.com',
      fullName: 'Tran Thi B',
      role: 'OWNER',
    };

    vi.spyOn(apiClient, 'login').mockResolvedValueOnce({ user: loggedInUser });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('owner@example.com');
    expect(screen.getByTestId('user-role').textContent).toBe('OWNER');
  });

  it('4. Logout: clears authenticated user state', async () => {
    const mockUser: User = {
      id: 'usr_agent_1',
      email: 'agent@example.com',
      fullName: 'Le Van C',
      role: 'AGENT',
    };

    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({ user: mockUser });
    vi.spyOn(apiClient, 'logout').mockResolvedValueOnce({ success: true, message: 'Logged out' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });
});
