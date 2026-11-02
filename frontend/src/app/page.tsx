import Link from 'next/link';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-[#0F766E]">
            <span className="material-symbols-outlined text-sm">domain</span>
            Nền tảng Quản lý & Giao dịch Bất động sản
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#142B4A] tracking-tight">
            Batdongsan
          </h1>
          <p className="text-base text-[#475569] leading-relaxed max-w-xl mx-auto">
            Hệ thống thông tin bất động sản minh bạch tích hợp mô-đun chia sẻ tin nội bộ (MLS) và điều phối yêu cầu tư vấn.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <span>Đăng nhập hệ thống</span>
              <span className="material-symbols-outlined text-base">login</span>
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#142B4A] text-sm font-semibold transition-all flex items-center gap-2"
            >
              <span>Đăng ký tài khoản</span>
              <span className="material-symbols-outlined text-base">person_add</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}