import React from 'react';

const PLATFORM_BENEFITS = [
  {
    icon: 'tune',
    title: 'Tìm kiếm thuận tiện',
    description:
      'Bộ lọc đa tiêu chí chính xác, nhanh chóng theo khu vực và tầm giá mong muốn. Dễ dàng so sánh mức giá và diện tích phù hợp với ngân sách gia đình bạn.',
  },
  {
    icon: 'verified_user',
    title: 'Thông tin minh bạch',
    description:
      'Dữ liệu thuộc tính rõ ràng về mức giá, diện tích và khu vực hành chính. Tin đăng được kiểm duyệt cẩn trọng trước khi công bố công khai.',
  },
  {
    icon: 'hub',
    title: 'Quản lý tin đăng chuyên nghiệp',
    description:
      'Nền tảng hỗ trợ môi giới và chủ nhà chia sẻ, cập nhật trạng thái tin tức thời qua mô-đun kết nối nội bộ hiệu quả, tối ưu thời gian giao dịch.',
  },
] as const;

export function TrustBenefits() {
  return (
    <section
      aria-labelledby="trust-benefits-heading"
      className="py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
        <h2
          id="trust-benefits-heading"
          className="text-2xl lg:text-3xl font-bold text-[#142B4A]"
        >
          Nền tảng giao dịch bất động sản an tâm &amp; hiệu quả
        </h2>
        <p className="text-sm lg:text-base text-[#475569] mt-2">
          Mang đến trải nghiệm kết nối tin cậy giữa người mua, người bán và mạng
          lưới môi giới chuyên nghiệp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {PLATFORM_BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="bg-white p-6 lg:p-7 rounded-lg border border-[#E2E8F0] shadow-sm flex flex-col items-start hover:border-[#0F766E]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-[#F1F5F9] text-[#0F766E] flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-2xl">
                {benefit.icon}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[#142B4A] mb-2.5">
              {benefit.title}
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
