import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Batdongsan – Tìm kiếm & Quản lý Bất động sản',
    template: '%s | Batdongsan',
  },
  description:
    'Nền tảng tìm kiếm, đăng tin và quản lý bất động sản tích hợp MLS nội bộ dành cho người mua, chủ sở hữu và môi giới.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#142B4A] min-h-screen flex flex-col justify-between">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}