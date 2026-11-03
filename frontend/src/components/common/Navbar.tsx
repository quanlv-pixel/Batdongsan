'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Quản trị viên
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Môi giới
          </span>
        );
      case 'OWNER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Chủ nhà
          </span>
        );
      case 'BUYER':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Người mua
          </span>
        );
    }
  };

  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-all duration-200">
            <span className="material-symbols-outlined text-2xl">domain</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-[#142B4A]">
              Batdongsan
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#64748B] font-medium -mt-1">
              Hệ thống thông tin
            </span>
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Điều hướng chính">
          <Link
            href="/"
            className="text-sm font-medium text-[#142B4A] hover:text-[#0F766E] transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            href="/bat-dong-san?transactionType=FOR_SALE"
            className="text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors"
          >
            Mua bán
          </Link>
          <Link
            href="/bat-dong-san?transactionType=FOR_RENT"
            className="text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors"
          >
            Cho thuê
          </Link>
        </nav>

        {/* Right: Auth State Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {user.fullName ? user.fullName.charAt(0) : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#142B4A] leading-tight">
                    {user.fullName}
                  </span>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#142B4A] hover:text-[#0F766E] transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-medium shadow-sm transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#142B4A] hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 pt-3 pb-4 space-y-3">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#142B4A] hover:text-[#0F766E] py-2"
          >
            Trang chủ
          </Link>
          <Link
            href="/bat-dong-san?transactionType=FOR_SALE"
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#475569] hover:text-[#0F766E] py-2"
          >
            Mua bán
          </Link>
          <Link
            href="/bat-dong-san?transactionType=FOR_RENT"
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#475569] hover:text-[#0F766E] py-2"
          >
            Cho thuê
          </Link>
          {isAuthenticated && user ? (
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm font-semibold text-[#142B4A]">
                  {user.fullName}
                </span>
                {getRoleBadge(user.role)}
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium text-[#142B4A] border border-[#E2E8F0] rounded-lg"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium text-white bg-[#0F766E] rounded-lg"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
