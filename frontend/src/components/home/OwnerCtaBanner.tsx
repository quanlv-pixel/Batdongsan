import React from 'react';
import Link from 'next/link';

export function OwnerCtaBanner() {
  return (
    <section
      aria-labelledby="owner-cta-heading"
      className="pb-16 lg:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="bg-gradient-to-r from-teal-50 via-[#F1F5F9] to-slate-100 rounded-xl border border-[#CBD5E1] p-6 sm:p-8 lg:p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F766E] mb-3">
              <span className="material-symbols-outlined text-sm">
                campaign
              </span>
              <span>Dành riêng cho chủ nhà &amp; môi giới</span>
            </div>
            <h2
              id="owner-cta-heading"
              className="text-2xl lg:text-3xl font-bold text-[#142B4A] mb-2"
            >
              Bạn muốn đăng bán hoặc cho thuê bất động sản?
            </h2>
            <p className="text-sm lg:text-base text-[#475569] leading-relaxed">
              Tiếp cận khách hàng tiềm năng và kết nối mạng lưới môi giới uy tín
              nhanh chóng qua hệ thống kiểm duyệt và chia sẻ MLS minh bạch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <Link
              href="/register"
              className="bg-[#0F766E] hover:bg-[#0D655E] text-white font-semibold text-sm lg:text-base px-6 py-3 rounded-lg transition-all duration-150 active:scale-95 shadow-sm inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">
                person_add
              </span>
              <span>Đăng ký tài khoản ngay</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
