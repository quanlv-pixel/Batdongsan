'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { useDictionary, useLocalizedHref } from '@/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const handleLogout = async () => {
    await logout();
    router.push(localizeHref('/login'));
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            {dict.Navbar.roles.ADMIN}
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {dict.Navbar.roles.AGENT}
          </span>
        );
      case 'OWNER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {dict.Navbar.roles.OWNER}
          </span>
        );
      case 'BUYER':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            {dict.Navbar.roles.BUYER}
          </span>
        );
    }
  };

  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href={localizeHref('/')} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-all duration-200">
            <span className="material-symbols-outlined text-2xl">domain</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-[#142B4A]">
              {dict.Navbar.brandName}
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#64748B] font-medium -mt-1">
              {dict.Navbar.brandSubtitle}
            </span>
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-7"
          aria-label={dict.Navbar.mainNavAriaLabel}
        >
          <Link
            href={localizeHref('/')}
            className="text-sm font-medium text-[#142B4A] hover:text-[#0F766E] transition-colors"
          >
            {dict.Navbar.home}
          </Link>
          <Link
            href={localizeHref('/bat-dong-san?transactionType=FOR_SALE')}
            className="text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors"
          >
            {dict.Navbar.forSale}
          </Link>
          <Link
            href={localizeHref('/bat-dong-san?transactionType=FOR_RENT')}
            className="text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors"
          >
            {dict.Navbar.forRent}
          </Link>
          {isAuthenticated && user && user.role !== 'BUYER' && (
            <Link
              href={localizeHref('/quan-ly')}
              className="text-sm font-semibold text-[#0F766E] hover:text-[#0D655E] transition-colors flex items-center gap-1"
              data-testid="navbar-workspace-link"
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
              <span>{dict.Navbar.workspace || 'Quản lý'}</span>
            </Link>
          )}
          {isAuthenticated && user && user.role === 'ADMIN' && (
            <Link
              href={localizeHref('/admin')}
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-semibold text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-1.5"
              data-testid="mobile-navbar-admin-link"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>{dict.Navbar.admin || 'Quản trị'}</span>
            </Link>
          )}
          {isAuthenticated && user && user.role === 'ADMIN' && (
            <Link
              href={localizeHref('/admin')}
              className="text-sm font-semibold text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-1"
              data-testid="navbar-admin-link"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>{dict.Navbar.admin || 'Quản trị'}</span>
            </Link>
          )}
        </nav>

        {/* Right: Language Switcher & Auth State Actions */}
        <div className="hidden md:flex items-center gap-3.5">
          <LanguageSwitcher />

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
                title={dict.Navbar.logout}
              >
                <span className="material-symbols-outlined text-base">
                  logout
                </span>
                <span>{dict.Navbar.logout}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href={localizeHref('/login')}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#142B4A] hover:text-[#0F766E] transition-colors"
              >
                {dict.Navbar.login}
              </Link>
              <Link
                href={localizeHref('/register')}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-medium shadow-sm transition-all"
              >
                {dict.Navbar.register}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls: Language Switcher + Hamburger button */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher compact />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#142B4A] hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label={dict.Navbar.toggleMenuAriaLabel}
            aria-expanded={isMenuOpen}
            data-testid="mobile-menu-toggle"
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
            href={localizeHref('/')}
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#142B4A] hover:text-[#0F766E] py-2"
          >
            {dict.Navbar.home}
          </Link>
          <Link
            href={localizeHref('/bat-dong-san?transactionType=FOR_SALE')}
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#475569] hover:text-[#0F766E] py-2"
          >
            {dict.Navbar.forSale}
          </Link>
          <Link
            href={localizeHref('/bat-dong-san?transactionType=FOR_RENT')}
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm font-medium text-[#475569] hover:text-[#0F766E] py-2"
          >
            {dict.Navbar.forRent}
          </Link>
          {isAuthenticated && user && user.role !== 'BUYER' && (
            <Link
              href={localizeHref('/quan-ly')}
              onClick={() => setIsMenuOpen(false)}
              className="block text-sm font-semibold text-[#0F766E] hover:text-[#0D655E] py-2 flex items-center gap-1"
              data-testid="mobile-navbar-workspace-link"
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
              <span>{dict.Navbar.workspace || 'Quản lý'}</span>
            </Link>
          )}
          {isAuthenticated && user && user.role === 'ADMIN' && (
            <Link
              href={localizeHref('/admin')}
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-semibold text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-1.5"
              data-testid="mobile-navbar-admin-link"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>{dict.Navbar.admin || 'Quản trị'}</span>
            </Link>
          )}
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
                <span className="material-symbols-outlined text-base">
                  logout
                </span>
                <span>{dict.Navbar.logout}</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <Link
                href={localizeHref('/login')}
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium text-[#142B4A] border border-[#E2E8F0] rounded-lg"
              >
                {dict.Navbar.login}
              </Link>
              <Link
                href={localizeHref('/register')}
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium text-white bg-[#0F766E] rounded-lg"
              >
                {dict.Navbar.register}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
