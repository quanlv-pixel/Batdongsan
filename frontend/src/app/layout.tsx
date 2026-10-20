import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Batdongsan – Tìm kiếm & Quản lý Bất động sản",
    template: "%s | Batdongsan",
  },
  description:
    "Nền tảng tìm kiếm, đăng tin và quản lý bất động sản tích hợp MLS nội bộ dành cho người mua, chủ sở hữu và môi giới.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}