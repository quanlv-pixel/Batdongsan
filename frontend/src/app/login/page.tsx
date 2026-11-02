'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClientError } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

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
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email: email.trim(), password, rememberMe });
      // Redirect to home page upon successful login
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrorMessage('Email hoặc mật khẩu không chính xác');
        } else {
          setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.';
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
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-all duration-200">
              <span className="material-symbols-outlined text-2xl">domain</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#142B4A]">Batdongsan</span>
              <span className="text-[10px] tracking-wider uppercase text-[#64748B] font-medium -mt-1">
                Hệ thống thông tin
              </span>
            </div>
          </Link>

          {/* Right: Navigation Link & Badge */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E2E8F0] text-xs font-medium text-[#64748B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
              Dữ liệu minh họa
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F766E] transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Quay lại Trang chủ</span>
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
                  alt="Không gian nội thất căn hộ hiện đại tràn ngập ánh sáng tự nhiên"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#142B4A]/70 via-transparent to-transparent flex items-end p-3">
                  <span className="text-xs font-medium text-white/95 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-300">verified</span>
                    Môi trường giao dịch an tâm & minh bạch
                  </span>
                </div>
              </div>

              {/* Panel Core Content */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F766E]">
                  <span className="material-symbols-outlined text-sm">cottage</span>
                  Cổng quản lý Batdongsan
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#142B4A] tracking-tight mb-2">
                    Chào mừng bạn trở lại
                  </h2>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    Đăng nhập để quản lý tin đăng và tiếp tục hành trình tìm kiếm bất động sản.
                  </p>
                </div>

                {/* 3 Feature bullet chips */}
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">real_estate_agent</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">Quản lý tin đăng của bạn</p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        Dễ dàng đăng mới, theo dõi trạng thái kiểm duyệt và hiệu suất tin đăng.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">favorite</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">Theo dõi bất động sản đã lưu</p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        Cập nhật biến động giá và thông báo tin đăng phù hợp kịp thời.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 bg-white/90 p-3 rounded-lg border border-[#E2E8F0]/90">
                    <div className="w-7 h-7 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#142B4A]">Nhận & quản lý yêu cầu liên hệ</p>
                      <p className="text-[#64748B] mt-0.5 leading-snug">
                        Kết nối với khách hàng tiềm năng an tâm và bảo mật theo phân quyền tài khoản.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Academic Note at bottom of left panel */}
            <div className="pt-6 mt-4 border-t border-[#E2E8F0]/80">
              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">school</span>
                Nền tảng học thuật phục vụ đồ án công nghệ thông tin.
              </p>
            </div>
          </section>

          {/* B. Right Column - Login Form Card (lg:col-span-7) */}
          <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight mb-2">
                Đăng nhập
              </h1>
              <p className="text-sm text-[#475569]">
                Nhập thông tin tài khoản để tiếp tục truy cập hệ thống.
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
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập địa chỉ email của bạn"
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
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569] transition-colors focus:outline-none"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                  <span className="text-[#475569] font-medium">Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[#0F766E] font-medium hover:underline hover:text-[#0D655E] transition-colors focus:outline-none"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Informative Note regarding 15-minute JWT session validity */}
              <p className="text-[11px] text-[#64748B] leading-tight">
                * Phiên đăng nhập hiện có hiệu lực tối đa 15 phút. Ghi nhớ đăng nhập dài hạn sẽ được hỗ trợ khi hệ thống bổ sung cơ chế gia hạn phiên.
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
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <span className="material-symbols-outlined text-base">login</span>
                    </>
                  )}
                </button>
              </div>

              {/* Registration Alternative */}
              <div className="text-center text-xs text-[#475569] pt-2">
                <span>Chưa có tài khoản? </span>
                <Link
                  href="/register"
                  className="text-[#0F766E] font-semibold hover:underline hover:text-[#0D655E] transition-colors"
                >
                  Đăng ký ngay
                </Link>
              </div>

              {/* Bottom terms note */}
              <div className="pt-6 border-t border-[#E2E8F0] mt-6">
                <p className="text-[11px] text-[#94A3B8] text-center leading-relaxed">
                  Bằng việc đăng nhập, bạn đồng ý với{' '}
                  <span className="underline cursor-pointer hover:text-[#0F766E]">
                    Điều khoản dịch vụ
                  </span>{' '}
                  và{' '}
                  <span className="underline cursor-pointer hover:text-[#0F766E]">
                    Chính sách bảo mật
                  </span>{' '}
                  của Batdongsan.
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
            <span>© 2026 Batdongsan. Nền tảng học thuật phục vụ đồ án công nghệ thông tin.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              Quy chế hoạt động
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              Chính sách bảo mật
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="hover:text-[#0F766E] transition-colors cursor-pointer">
              Điều khoản dịch vụ
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
                  <span className="material-symbols-outlined text-xl">lock_reset</span>
                </div>
                <h3 className="text-base font-bold text-[#142B4A]">Khôi phục mật khẩu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#94A3B8] hover:text-[#142B4A] transition-colors"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">info</span>
                Tính năng đang trong lộ trình phát triển
              </p>
              <p>
                Chức năng gửi email đặt lại mật khẩu (GAP-03) hiện chưa được hỗ trợ tại API backend.
                Vui lòng sử dụng tài khoản mẫu hoặc liên hệ quản trị viên để được hỗ trợ.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D655E] transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
