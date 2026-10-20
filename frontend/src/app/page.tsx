export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F8FAFC] p-8">
      <h1 className="text-4xl font-bold text-[#142B4A]">
        Batdongsan
      </h1>
      <p className="max-w-md text-center text-[#475569]">
        Nền tảng tìm kiếm và quản lý bất động sản tích hợp MLS nội bộ.
        Giao diện đang được phát triển.
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="rounded-lg bg-[#0F766E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0D6660] transition-colors"
        >
          Đăng nhập
        </a>
        <a
          href="/register"
          className="rounded-lg border border-[#E2E8F0] bg-white px-6 py-2.5 text-sm font-semibold text-[#142B4A] hover:bg-[#F8FAFC] transition-colors"
        >
          Đăng ký
        </a>
      </div>
    </main>
  );
}