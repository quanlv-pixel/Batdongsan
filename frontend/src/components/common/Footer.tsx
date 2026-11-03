'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#1E293B] border-t border-[#334155] text-[#F1F5F9] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 flex flex-col gap-8">
        {/* 4 Columns Grid from Stitch Homepage */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-8 border-b border-[#334155]">
          {/* Column 1: Brand & Description */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">domain</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                Batdongsan
              </span>
            </Link>
            <p className="text-sm text-[#CBD5E1] leading-relaxed pr-2">
              Nền tảng tìm kiếm và quản lý bất động sản trực tuyến tiện lợi, an tâm.
              Cầu nối thị trường minh bạch tích hợp mô-đun chia sẻ nội bộ (MLS).
            </p>
          </div>

          {/* Column 2: Danh mục tìm kiếm (Valid routes only) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">
              Khám phá bất động sản
            </h4>
            <Link
              href="/bat-dong-san?transactionType=FOR_SALE"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Bất động sản Mua bán
            </Link>
            <Link
              href="/bat-dong-san?transactionType=FOR_RENT"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Bất động sản Cho thuê
            </Link>
            <Link
              href="/bat-dong-san?propertyType=APARTMENT"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Căn hộ chung cư
            </Link>
            <Link
              href="/bat-dong-san?propertyType=HOUSE"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Nhà ở &amp; Nhà phố
            </Link>
          </div>

          {/* Column 3: Dành cho thành viên (Valid routes only) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">
              Dành cho khách hàng
            </h4>
            <Link
              href="/"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Trang chủ hệ thống
            </Link>
            <Link
              href="/login"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Truy cập tài khoản
            </Link>
            <Link
              href="/register"
              className="text-[#CBD5E1] hover:text-white transition-colors w-fit"
            >
              Mở tài khoản thành viên
            </Link>
          </div>

          {/* Column 4: Hỗ trợ */}
          <div className="lg:col-span-2 flex flex-col gap-3 text-sm">
            <h4 className="text-base font-semibold text-white mb-1">Hỗ trợ</h4>
            <div className="flex flex-col gap-1 text-[#CBD5E1]">
              <span className="text-xs text-[#94A3B8]">Email hỗ trợ:</span>
              <a
                href="mailto:hotro@batdongsan.local"
                className="text-white hover:text-[#5EEAD4] transition-colors font-medium"
              >
                hotro@batdongsan.local
              </a>
            </div>
            <div className="flex flex-col gap-1 text-[#CBD5E1]">
              <span className="text-xs text-[#94A3B8]">Giờ làm việc:</span>
              <span className="text-white">Thứ 2 - Thứ 6 (8h00 - 18h00)</span>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-3">
          <p>© 2026 Batdongsan. Nền tảng học thuật phục vụ đồ án công nghệ thông tin.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Quy chế hoạt động</span>
            <span className="text-[#475569]">•</span>
            <span>Chính sách bảo mật</span>
            <span className="text-[#475569]">•</span>
            <span>Điều khoản dịch vụ</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
