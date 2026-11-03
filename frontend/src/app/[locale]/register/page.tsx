'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RegistrationIntent } from '@/types';
import { ApiClientError } from '@/lib/api-client';
import { useDictionary, useLocalizedHref } from '@/i18n';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usagePurpose, setUsagePurpose] = useState<RegistrationIntent>('BUYER');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    if (!fullName.trim()) {
      setErrorMessage(dict.RegisterPage.errors.missingFullName);
      return;
    }
    if (!email.trim()) {
      setErrorMessage(dict.RegisterPage.errors.missingEmail);
      return;
    }
    if (password.length < 8) {
      setErrorMessage(dict.RegisterPage.errors.shortPassword);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(dict.RegisterPage.errors.passwordMismatch);
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(dict.RegisterPage.errors.missingTerms);
      return;
    }

    setIsLoading(true);

    try {
      // Whitelisted fields only sent to backend: email, password, fullName, registrationIntent
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        registrationIntent: usagePurpose,
      });

      setSuccessMessage(dict.RegisterPage.successMessage);

      setTimeout(() => {
        router.push(localizeHref('/login'));
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setErrorMessage(dict.RegisterPage.errors.emailConflict);
        } else {
          setErrorMessage(
            err.message || dict.RegisterPage.errors.registerFailed,
          );
        }
      } else {
        const message =
          err instanceof Error
            ? err.message
            : dict.RegisterPage.errors.networkError;
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#142B4A] antialiased">
      {/* 1. Header Tinh Gọn */}
      <header className="h-[68px] bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-sm flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Logo Batdongsan */}
          <Link
            href={localizeHref('/')}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">
                apartment
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl leading-none text-[#142B4A] tracking-tight">
                Batdongsan
              </span>
              <span className="text-[10px] tracking-wider text-[#64748B] uppercase font-semibold mt-1">
                {dict.RegisterPage.brandSubtitle}
              </span>
            </div>
          </Link>
          {/* Trailing Actions: Language Switcher & Về trang chủ */}
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher />
            <Link
              href={localizeHref('/')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              <span className="hidden sm:inline">{dict.RegisterPage.backToHome}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Khung Nội Dung Chính */}
      <main className="flex-1 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-5xl bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Cột giới thiệu bên trái (Left Branding Panel - col-span-5) */}
          <aside className="lg:col-span-5 bg-gradient-to-b from-teal-50/60 via-slate-50 to-[#F1F5F9] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Ảnh kiến trúc/nội thất */}
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-[#E2E8F0] shadow-sm bg-slate-100">
                <Image
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
                  alt={dict.RegisterPage.heroImageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#142B4A]/60 via-transparent to-transparent"></div>
                {/* Badge góc dưới ảnh */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-start">
                  <span className="bg-white/95 backdrop-blur-sm text-xs font-medium text-[#142B4A] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm border border-slate-200">
                    <span className="material-symbols-outlined text-[#0F766E] text-sm">
                      verified
                    </span>
                    {dict.RegisterPage.verifiedEnvironment}
                  </span>
                </div>
              </div>

              {/* Tiêu đề & Giới thiệu */}
              <h1 className="font-bold text-2xl text-[#142B4A] mt-6 mb-2 tracking-tight">
                {dict.RegisterPage.welcomeTitle}
              </h1>
              <p className="text-sm text-[#475569] leading-relaxed mb-6">
                {dict.RegisterPage.welcomeSubtitle}
              </p>

              {/* 3 Lợi ích thiết thực */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#0F766E] text-xl shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[#142B4A]">
                      {dict.RegisterPage.features.search.title}
                    </h4>
                    <p className="text-xs text-[#64748B] leading-normal mt-0.5">
                      {dict.RegisterPage.features.search.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#0F766E] text-xl shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[#142B4A]">
                      {dict.RegisterPage.features.save.title}
                    </h4>
                    <p className="text-xs text-[#64748B] leading-normal mt-0.5">
                      {dict.RegisterPage.features.save.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#0F766E] text-xl shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[#142B4A]">
                      {dict.RegisterPage.features.manage.title}
                    </h4>
                    <p className="text-xs text-[#64748B] leading-normal mt-0.5">
                      {dict.RegisterPage.features.manage.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Khối bảo mật cuối cột */}
            <div className="pt-6 mt-6 border-t border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#64748B]">
              <span className="material-symbols-outlined text-[#0F766E] text-lg">
                shield
              </span>
              <span>{dict.RegisterPage.securityNote}</span>
            </div>
          </aside>

          {/* Cột form đăng ký bên phải (Right Registration Form Card - col-span-7) */}
          <section className="lg:col-span-7 p-6 sm:p-8 md:p-10 bg-white flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="font-bold text-2xl text-[#142B4A]">
                {dict.RegisterPage.formTitle}
              </h2>
              <p className="text-sm text-[#475569] mt-1">
                {dict.RegisterPage.formSubtitle}
              </p>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-red-500 text-lg shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Họ và tên */}
              <div>
                <label
                  className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                  htmlFor="full_name"
                >
                  {dict.RegisterPage.fullNameLabel}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-lg pointer-events-none">
                    person
                  </span>
                  <input
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] outline-none transition-all"
                    id="full_name"
                    name="full_name"
                    placeholder={dict.RegisterPage.fullNamePlaceholder}
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                  htmlFor="email"
                >
                  {dict.RegisterPage.emailLabel}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-lg pointer-events-none">
                    mail
                  </span>
                  <input
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] outline-none transition-all"
                    id="email"
                    name="email"
                    placeholder={dict.RegisterPage.emailPlaceholder}
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label
                  className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                  htmlFor="phone"
                >
                  {dict.RegisterPage.phoneLabel}{' '}
                  <span className="text-[#94A3B8] font-normal">
                    {dict.RegisterPage.phoneOptional}
                  </span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-lg pointer-events-none">
                    phone
                  </span>
                  <input
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] outline-none transition-all"
                    id="phone"
                    name="phone"
                    placeholder={dict.RegisterPage.phonePlaceholder}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#64748B] leading-tight">
                  {dict.RegisterPage.phoneNote}
                </p>
              </div>

              {/* Lưới 2 cột cho Mật khẩu & Xác nhận mật khẩu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mật khẩu */}
                <div>
                  <label
                    className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                    htmlFor="password"
                  >
                    {dict.RegisterPage.passwordLabel}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-lg pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-9 pr-9 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] outline-none transition-all"
                      id="password"
                      name="password"
                      placeholder={dict.RegisterPage.passwordPlaceholder}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                      aria-label={
                        showPassword
                          ? dict.RegisterPage.hidePassword
                          : dict.RegisterPage.showPassword
                      }
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                  <label
                    className="block text-xs font-semibold text-[#142B4A] mb-1.5"
                    htmlFor="confirm_password"
                  >
                    {dict.RegisterPage.confirmPasswordLabel}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-lg pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-9 pr-9 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] outline-none transition-all"
                      id="confirm_password"
                      name="confirm_password"
                      placeholder={dict.RegisterPage.confirmPasswordPlaceholder}
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] focus:outline-none"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? dict.RegisterPage.hideConfirmPassword
                          : dict.RegisterPage.showConfirmPassword
                      }
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mục đích sử dụng chính */}
              <div className="pt-2">
                <span className="block text-xs font-semibold text-[#142B4A] mb-2.5">
                  {dict.RegisterPage.usagePurposeLabel}
                </span>
                <div
                  className="space-y-2.5"
                  role="radiogroup"
                  aria-label={dict.RegisterPage.usagePurposeLabel}
                >
                  {/* Lựa chọn 1: Tìm mua hoặc thuê */}
                  <label
                    className={`relative rounded-lg border p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      usagePurpose === 'BUYER'
                        ? 'border-[#0F766E] bg-teal-50/40 shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:border-[#0F766E]'
                    }`}
                  >
                    <input
                      checked={usagePurpose === 'BUYER'}
                      onChange={() => setUsagePurpose('BUYER')}
                      className="mt-0.5 text-[#0F766E] focus:ring-[#0F766E] border-slate-300 accent-[#0F766E]"
                      name="usage_purpose"
                      type="radio"
                      value="BUYER"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-[#142B4A] block text-sm">
                        {dict.RegisterPage.usageOptions.BUYER.title}
                      </span>
                      <span className="text-[#64748B] mt-0.5 block">
                        {dict.RegisterPage.usageOptions.BUYER.description}
                      </span>
                    </div>
                  </label>

                  {/* Lựa chọn 2: Đăng tin bất động sản */}
                  <label
                    className={`relative rounded-lg border p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      usagePurpose === 'OWNER'
                        ? 'border-[#0F766E] bg-teal-50/40 shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:border-[#0F766E]'
                    }`}
                  >
                    <input
                      checked={usagePurpose === 'OWNER'}
                      onChange={() => setUsagePurpose('OWNER')}
                      className="mt-0.5 text-[#0F766E] focus:ring-[#0F766E] border-slate-300 accent-[#0F766E]"
                      name="usage_purpose"
                      type="radio"
                      value="OWNER"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-[#142B4A] block text-sm">
                        {dict.RegisterPage.usageOptions.OWNER.title}
                      </span>
                      <span className="text-[#64748B] mt-0.5 block">
                        {dict.RegisterPage.usageOptions.OWNER.description}
                      </span>
                    </div>
                  </label>

                  {/* Lựa chọn 3: Hoạt động môi giới */}
                  <label
                    className={`relative rounded-lg border p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      usagePurpose === 'AGENT'
                        ? 'border-[#0F766E] bg-teal-50/40 shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:border-[#0F766E]'
                    }`}
                  >
                    <input
                      checked={usagePurpose === 'AGENT'}
                      onChange={() => setUsagePurpose('AGENT')}
                      className="mt-0.5 text-[#0F766E] focus:ring-[#0F766E] border-slate-300 accent-[#0F766E]"
                      name="usage_purpose"
                      type="radio"
                      value="AGENT"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-[#142B4A] block text-sm">
                        {dict.RegisterPage.usageOptions.AGENT.title}
                      </span>
                      <span className="text-[#64748B] mt-0.5 block">
                        {dict.RegisterPage.usageOptions.AGENT.description}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Dòng giải thích lưu ý màu xám */}
                <div className="mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-[#E2E8F0] flex items-start gap-2 text-xs text-[#475569]">
                  <span className="material-symbols-outlined text-[#0F766E] text-base shrink-0 mt-0.5">
                    info
                  </span>
                  <span>
                    <strong>{dict.RegisterPage.roleNotePrefix}</strong>{' '}
                    {dict.RegisterPage.roleNoteBody}
                  </span>
                </div>
              </div>

              {/* Điều khoản & CTA */}
              <div className="pt-2 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#0F766E] focus:ring-[#0F766E] border-[#CBD5E1] accent-[#0F766E]"
                    required
                    type="checkbox"
                  />
                  <span className="text-xs text-[#475569] leading-normal">
                    {dict.RegisterPage.termsPrefix}{' '}
                    <span className="text-[#0F766E] font-medium hover:underline cursor-pointer">
                      {dict.RegisterPage.termsOfUse}
                    </span>{' '}
                    {dict.RegisterPage.termsAnd}{' '}
                    <span className="text-[#0F766E] font-medium hover:underline cursor-pointer">
                      {dict.RegisterPage.privacyPolicy}
                    </span>{' '}
                    {dict.RegisterPage.termsSuffix}
                  </span>
                </label>

                {/* Nút CTA chính */}
                <button
                  className="w-full h-12 bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#0F766E]/70 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{dict.RegisterPage.submitLoading}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">
                        person_add
                      </span>
                      <span>{dict.RegisterPage.submitIdle}</span>
                    </>
                  )}
                </button>

                {/* Dòng chuyển tiếp */}
                <p className="text-center text-sm text-[#475569] pt-1">
                  {dict.RegisterPage.hasAccountPrompt}{' '}
                  <Link
                    className="text-[#0F766E] font-semibold hover:underline ml-1"
                    href={localizeHref('/login')}
                  >
                    {dict.RegisterPage.signInLink}
                  </Link>
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* 3. Footer Tối Giản Cuối Trang */}
      <footer className="bg-[#F1F5F9] border-t border-[#E2E8F0] py-6 px-6 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span>{dict.RegisterPage.footerCopyright}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.RegisterPage.operatingRules}
            </span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.RegisterPage.footerPrivacy}
            </span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              {dict.RegisterPage.footerTerms}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
