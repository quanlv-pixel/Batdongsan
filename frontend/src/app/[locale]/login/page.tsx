'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClientError } from '@/lib/api-client';
import { useDictionary, useLocalizedHref } from '@/i18n';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick check
    if (!email.trim() || !password) {
      setErrorMessage(dict.LoginPage.errors.emptyFields);
      return;
    }

    setIsLoading(true);

    try {
      await login({ email: email.trim(), password, rememberMe });
      // Redirect to home page upon successful login
      router.push(localizeHref('/'));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrorMessage(dict.LoginPage.errors.invalidCredentials);
        } else {
          setErrorMessage(err.message || dict.LoginPage.errors.loginFailed);
        }
      } else {
        const message =
          err instanceof Error
            ? err.message
            : dict.LoginPage.errors.networkError;
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#142B4A] antialiased">
      {/* 1. Top Minimal Header Bar */}
      <header className="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          {/* Left: Batdongsan Logo */}
          <Link
            href={localizeHref('/')}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-all duration-200">
              <span className="material-symbols-outlined text-2xl">domain</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#142B4A]">
                Batdongsan
              </span>
              <span className="text-[10px] tracking-wider uppercase text-[#64748B] font-medium -mt-1">
                {dict.LoginPage.brandSubtitle}
              </span>
            </div>
          </Link>

          {/* Right: Language Switcher, Demo Badge & Back Link */}
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E2E8F0] text-xs font-medium text-[#64748B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
              {dict.LoginPage.demoBadge}
            </span>
            <Link
              href={localizeHref('/')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              <span className="hidden xs:inline sm:inline">
                {dict.LoginPage.backToHome}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content - Centered Two-Column Split Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          {/* A. Left Column - Branding & Platform Value Panel (lg:col-span-5) */}
          <section className="lg:col-span-5 bg-gradient-to-b from-teal-50/60 via-slate-50 to-[#F1F5F9] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between p-6 sm:p-8 relative">
            <div>
              {/* Visual Accent Corner Banner */}
              <div className="mb-6 relative rounded-lg overflow-hidden border border-[#E2E8F0]/80 shadow-sm aspect-[16/9] w-full bg-slate-100">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
                  alt={dict.LoginPage.heroImageAlt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#142B4A]/70 via-transparent to-transparent flex items-end p-3">
                  <span className="text-xs font-medium text-white/95 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-300">
                      verified
                    </span>
                    {dict.LoginPage.verifiedEnvironment}
                  </span>
                </div>
              </div>

              {/* Panel Core Content */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F766E]">
                  <span className="material-symbols-outlined text-sm">
                    cottage
                  </span>
                  {dict.LoginPage.portalBadge}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#142B4A] tracking-tight mb-2">
                    {dict.LoginPage.welcomeTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    {dict.LoginPage.welcomeSubtitle}
                  </p>
                </div>

                {/* 3 Feature bullet chips */}
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">
                        real_estate_agent
                      </span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">
                        {dict.LoginPage.features.manage.title}
                      </p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        {dict.LoginPage.features.manage.description}
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">
                        favorite
                      </span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">
                        {dict.LoginPage.features.saved.title}
                      </p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        {dict.LoginPage.features.saved.description}
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">
                        chat_bubble
                      </span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">
                        {dict.LoginPage.features.contacts.title}
                      </p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        {dict.LoginPage.features.contacts.description}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Academic Note at bottom of left panel */}
            <div className="pt-6 mt-4 border-t border-[#E2E8F0]/80">
              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">
                  school
                </span>
                {dict.LoginPage.academicNote}
              </p>
            </div>
          </section>

          {/* B. Right Column - Login Form Card (lg:col-span-7) */}
          <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight mb-2">
                {dict.LoginPage.formTitle}
              </h1>
              <p className="text-sm text-[#475569]">
                {dict.LoginPage.formSubtitle}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-red-500 text-lg shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                >
                  {dict.LoginPage.emailLabel}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <span className="material-symbols-outlined text-lg">
                      mail
                    </span>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.LoginPage.emailPlaceholder}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                >
                  {dict.LoginPage.passwordLabel}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <span className="material-symbols-outlined text-lg">
                      lock
                    </span>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={dict.LoginPage.passwordPlaceholder}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569] transition-colors focus:outline-none"
                    title={
                      showPassword
                        ? dict.LoginPage.hidePassword
                        : dict.LoginPage.showPassword
                    }
                    aria-label={
                      showPassword
                        ? dict.LoginPage.hidePassword
                        : dict.LoginPage.showPassword
                    }
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Utility Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0F766E] focus:ring-[#0F766E] cursor-pointer accent-[#0F766E]"
                  />
                  <span className="text-[#475569] font-medium">
                    {dict.LoginPage.rememberMe}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[#0F766E] font-medium hover:underline hover:text-[#0D655E] transition-colors focus:outline-none"
                >
                  {dict.LoginPage.forgotPassword}
                </button>
              </div>

              {/* Informative Note regarding 15-minute JWT session validity */}
              <p className="text-[11px] text-[#64748B] leading-tight">
                {dict.LoginPage.sessionValidityNote}
              </p>

              {/* Primary CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#0F766E]/70 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{dict.LoginPage.submitLoading}</span>
                    </>
                  ) : (
                    <>
                      <span>{dict.LoginPage.submitIdle}</span>
                      <span className="material-symbols-outlined text-base">
                        login
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Registration Alternative */}
              <div className="text-center text-xs text-[#475569] pt-2">
                <span>{dict.LoginPage.noAccountPrompt}</span>
                <Link
                  href={localizeHref('/register')}
                  className="text-[#0F766E] font-semibold hover:underline hover:text-[#0D655E] transition-colors"
                >
                  {dict.LoginPage.registerNow}
                </Link>
              </div>

              {/* Bottom terms note */}
              <div className="pt-6 border-t border-[#E2E8F0] mt-6">
                <p className="text-[11px] text-[#94A3B8] text-center leading-relaxed">
                  {dict.LoginPage.termsPrefix}{' '}
                  <span className="underline cursor-pointer hover:text-[#0F766E]">
                    {dict.LoginPage.termsOfService}
                  </span>{' '}
                  {dict.LoginPage.termsAnd}{' '}
                  <span className="underline cursor-pointer hover:text-[#0F766E]">
                    {dict.LoginPage.privacyPolicy}
                  </span>{' '}
                  {dict.LoginPage.termsSuffix}
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full bg-[#F1F5F9] border-t border-[#E2E8F0] py-4 px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-2">
          <div>
            <span>{dict.LoginPage.footerCopyright}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.LoginPage.operatingRules}
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.LoginPage.privacyPolicy}
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.LoginPage.termsOfService}
            </span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal (GAP-03 deferred notice) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-teal-50 text-[#0F766E] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">
                    lock_reset
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#142B4A]">
                  {dict.LoginPage.forgotModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#94A3B8] hover:text-[#142B4A] transition-colors"
                aria-label={dict.LoginPage.forgotModal.closeAriaLabel}
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">info</span>
                {dict.LoginPage.forgotModal.roadmapTitle}
              </p>
              <p>{dict.LoginPage.forgotModal.roadmapDescription}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D655E] transition-colors"
              >
                {dict.LoginPage.forgotModal.acknowledgeButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
