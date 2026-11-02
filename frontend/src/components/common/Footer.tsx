'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#F1F5F9] border-t border-[#E2E8F0] py-4 px-6 sm:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-2">
        <div>
          <span>© 2026 Batdongsan. Nền tảng học thuật phục vụ đồ án công nghệ thông tin.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="#" className="hover:text-[#0F766E] transition-colors">
            Quy chế hoạt động
          </Link>
          <span className="text-[#CBD5E1]">•</span>
          <Link href="#" className="hover:text-[#0F766E] transition-colors">
            Chính sách bảo mật
          </Link>
          <span className="text-[#CBD5E1]">•</span>
          <Link href="#" className="hover:text-[#0F766E] transition-colors">
            Điều khoản dịch vụ
          </Link>
        </div>
      </div>
    </footer>
  );
}
