# BÁO CÁO HOÀN THÀNH PHASE 2E-2A.1 — NỀN TẢNG ĐA NGÔN NGỮ (TIẾNG VIỆT / TIẾNG ANH)

**Dự án:** Nền tảng Bất động sản Batdongsan
**Hạng mục:** Phase 2E-2A.1 — Multilingual Foundation (Vietnamese `vi` / English `en`) & Final Review / SEO & Functional Verification
**Ngày báo cáo:** 2026-11-03
**Nhánh phát triển:** `feat/phase2e2a1-i18n` (tạo từ checkpoint `cc3da5e` trên nhánh `feat/phase2e2-public-listings`)
**Trạng thái:** ĐÃ HOÀN THÀNH TRIỂN KHAI, RÀ SOÁT CUỐI, KIỂM THỬ TỰ ĐỘNG & NGHIỆM THU TRÌNH DUYỆT THỰC TẾ — CHỜ CHỦ DỰ ÁN PHÊ DUYỆT COMMIT/PUSH

---

## 1. Tóm tắt điều hành (Executive Summary)

Phase 2E-2A.1 đã thiết lập hoàn chỉnh nền tảng quốc tế hóa (i18n) song ngữ **Tiếng Việt (`vi` — mặc định)** và **Tiếng Anh (`en` — ngôn ngữ thứ hai)** cho ứng dụng Frontend (`Next.js 16.4.2`, `React 19.2.3`, `TypeScript`, `Tailwind CSS v4`), đồng thời hoàn tất đợt rà soát cuối về SEO Canonical URL, kiểm thử tương tác biểu mẫu Đăng nhập/Đăng ký và kiểm thử hồi quy toàn bộ 4 tuyến BFF xác thực:

- **Kiến trúc i18n chuẩn App Router:** Tích hợp `next-intl@4.14.9` kết hợp với hệ thống định tuyến phân đoạn ngôn ngữ `src/app/[locale]/...` và bộ lọc điều hướng `src/proxy.ts` chuẩn của Next.js 16.4.2 (`cacheComponents: true`).
- **Tương thích ngược 100% với đường dẫn cũ và bộ kiểm thử hiện có:** Các đường dẫn có tiền tố ngôn ngữ (`/vi`, `/en`, `/vi/login`, `/en/login`, `/vi/register`, `/en/register`) hoạt động song song với cơ chế tự động chuyển hướng bảo toàn tham số truy vấn (`307 Temporary Redirect`) cho các đường dẫn truyền thống (`/`, `/login`, `/register`).
- **Bảo toàn tuyệt đối các tuyến API & BFF:** Toàn bộ `/api/*` (bao gồm cả 4 tuyến `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`), `/_next/*`, `/_vercel/*` và tệp tĩnh được loại trừ khỏi bộ định tuyến ngôn ngữ (`redirected: false`).
- **SEO Canonical & `hreflang` an toàn cho cả Development và Production (`src/i18n/metadata.ts`):** Trong môi trường phát triển cục bộ (`NODE_ENV !== 'production'`), hệ thống tự động sử dụng `http://localhost:3000`. Trong môi trường Production (`NODE_ENV === 'production'`), hệ thống ưu tiên đọc miền cấu hình từ `NEXT_PUBLIC_SITE_URL` (hoặc `SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`) để xuất URL tuyệt đối chính xác; nếu chưa cấu hình biến môi trường miền thực tế khi build production, hệ thống xuất đường dẫn tương đối sạch (`/vi`, `/en/login`, ...) và **tuyệt đối không bao giờ phát sinh `http://localhost:3000` giả tạo trong HTML bản dựng Production**.
- **Việt hóa / Anh hóa toàn diện giao diện tĩnh, giữ nguyên tính trung thực dữ liệu:** Toàn bộ chuỗi giao diện thuộc sở hữu nền tảng trên `Navbar`, `Footer`, `LanguageSwitcher`, Trang chủ (`HeroSearchBox`, `CategoryGrid`, `LatestListingsGrid`, `ListingCard`, `TrustBenefits`, `OwnerCtaBanner`) và Xác thực (`LoginPage`, `RegisterPage`) đã được chuyển sang từ điển ngôn ngữ tập trung (`messages/vi.json`, `messages/en.json`). Dữ liệu tin đăng do người dùng tạo (`title`, `description`, địa giới hành chính) và đơn vị tiền tệ gốc (`VND`) được giữ nguyên trung thực, không tự dịch máy sai lệch.
- **Xác minh độc lập bằng kiểm thử tự động và trình duyệt Chrome thực tế:**
  - **Unit & Integration Tests (Vitest):** `11/11` bộ kiểm thử đạt tuyệt đối (`83/83` bài test PASS, bao gồm `14` bài test chuyên biệt mới trong `src/__tests__/i18n.test.tsx`).
  - **ESLint:** `0` lỗi, `0` cảnh báo.
  - **Next.js Production Build (`npm run build`):** Biên dịch thành công với `cacheComponents: true` và Partial Prerendering (`◐ /vi`, `◐ /en`, `○ /vi/login`, `○ /en/login`, `○ /vi/register`, `○ /en/register`).
  - **Trình duyệt Chrome thực tế (CDP Desktop `1440×900` & Mobile `390×844`):** Đã kiểm chứng toàn bộ kịch bản định tuyến, chuyển đổi ngôn ngữ, tương tác biểu mẫu `/vi/login`, `/en/login`, `/vi/register`, `/en/register`, và cả 4 tuyến BFF `/api/auth/*` kết nối trực tiếp tới NestJS Backend (`http://localhost:3001`) và PostgreSQL 16 với `0` lỗi console, `0` lỗi hydration, `0` tràn khung ngang (`scrollWidth === clientWidth`).

---

## 2. Xác minh trạng thái Kho lưu trữ và Git Baseline (Repository & Git Baseline Verification)

Trạng thái Git đã được kiểm tra nghiêm ngặt trước và sau khi thực hiện rà soát:

- **Nhánh hiện tại:** `feat/phase2e2a1-i18n`
- **Commit cơ sở (HEAD):** `cc3da5e fix(phase2e2a): resolve browser rendering issues` (kế thừa từ `aa514d0 feat(phase2e2a): implement public homepage and listing formatters`)
- **Bảo vệ tệp nội bộ chưa theo dõi (Untracked private files):**
  - `backend/check-db-fingerprint.mjs`: Giữ nguyên, không đọc nội dung nhạy cảm, không chỉnh sửa, không stage, không xóa.
  - `phase2d2-review.patch`: Giữ nguyên, không đọc nội dung nhạy cảm, không chỉnh sửa, không stage, không xóa.
- **Phạm vi tác động:** Chỉ thay đổi trong phạm vi `frontend/` và cập nhật báo cáo tại `docs/reports/`. Không chỉnh sửa bất kỳ tệp nào trong `backend/`, Prisma schema, migration hay dữ liệu cơ sở dữ liệu.

---

## 3. Kiến trúc i18n được lựa chọn và Lý do kỹ thuật (Selected i18n Architecture & Library Justification)

### 3.1. Lựa chọn thư viện: `next-intl@4.14.9`
- **Tương thích trực tiếp với Next.js 16 & React 19:** `next-intl@4.14.9` hỗ trợ chính thức peer dependencies `next: "^12.0.0 || ... || ^16.0.0"` và `react: "^19.0.0"`.
- **Hỗ trợ cả Server Components và Client Components:** Cung cấp plugin `createNextIntlPlugin` cho `next.config.ts`, `setRequestLocale` cho quá trình Prerendering/Cache Components của Next.js 16, và `NextIntlClientProvider` cho các Client Components.
- **Lớp bọc đồng nhất (`src/i18n/index.tsx` & `src/i18n/dictionaries.ts`):**
  - Để đảm bảo 100% các bài kiểm thử đơn vị hiện có (`Navbar.test.tsx`, `HeroSearchBox.test.tsx`, `ListingCard.test.tsx`, `HomePage.test.tsx`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`) vẫn chạy độc lập kể cả khi render component riêng lẻ bên ngoài `<AppLocaleProvider>`, lớp tiện ích `useDictionary()`, `useAppLocale()` và `useLocalizedHref()` tự động fallback về từ điển Tiếng Việt (`vi`) và đường dẫn không tiền tố khi không có Provider bao ngoài, đồng thời kích hoạt đầy đủ đường dẫn có tiền tố (`/vi/...`, `/en/...`) và từ điển tương ứng khi chạy trong bố cục `src/app/[locale]/layout.tsx`.
  - Việc tách `getDictionary(locale)` sang mô-đun thuần `src/i18n/dictionaries.ts` (không chứa chỉ thị `'use client'`) giúp các Server Components (`src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/i18n/metadata.ts`) truy xuất từ điển trực tiếp trong quá trình tĩnh hóa (`next build`) mà không vi phạm ranh giới Server/Client của React 19.

---

## 4. Ngôn ngữ hỗ trợ và Hành vi Ngôn ngữ Mặc định (Supported Locales & Default Locale Behavior)

| Thuộc tính | Giá trị cấu hình | Chi tiết |
| :--- | :--- | :--- |
| `SUPPORTED_LOCALES` | `['vi', 'en']` | Tiếng Việt (`vi`) và Tiếng Anh (`en`) |
| `DEFAULT_LOCALE` | `'vi'` | Tiếng Việt là ngôn ngữ mặc định của nền tảng |
| `LOCALE_COOKIE_NAME` | `'NEXT_LOCALE'` | Cookie lưu trữ lựa chọn ngôn ngữ của người dùng (`path=/; max-age=31536000; SameSite=Lax`) |

**Thứ tự ưu tiên xác định ngôn ngữ (Locale Resolution Order):**
1. **Phân đoạn ngôn ngữ tường minh trên URL (`/vi/...` hoặc `/en/...`):** Luôn có độ ưu tiên cao nhất. Khi người dùng truy cập `/en` hoặc `/vi`, hệ thống hiển thị đúng ngôn ngữ đó và cập nhật cookie `NEXT_LOCALE` tương ứng.
2. **Lựa chọn ngôn ngữ đã lưu của người dùng (`NEXT_LOCALE` cookie):** Khi người dùng truy cập các đường dẫn không có tiền tố (`/`, `/login`, `/register`), nếu đã có cookie `NEXT_LOCALE=en` (hoặc `vi`), `src/proxy.ts` chuyển hướng (`307`) tới `/en/...` (hoặc `/vi/...`).
3. **Khách truy cập lần đầu (First-time visitor):** Khi chưa có cookie `NEXT_LOCALE` và truy cập đường dẫn không có tiền tố (`/`, `/login`, `/register`), hệ thống **luôn mặc định chuyển về `/vi`** (ngay cả khi trình duyệt gửi header `Accept-Language: en-US,en;q=0.9`), đảm bảo đúng yêu cầu sản phẩm.

---

## 5. Cấu trúc Định tuyến và Xử lý Tương thích ngược (Route Structure & Backward-Compatibility Handling)

### 5.1. Cấu trúc cây thư mục App Router (`src/app/[locale]/`)
- `src/app/[locale]/layout.tsx`: Root layout nhận `params: Promise<{ locale: string }>`, kiểm tra tính hợp lệ qua `isValidLocale(locale)` (gọi `notFound()` nếu không hợp lệ), thiết lập `<html lang={locale}>`, cung cấp `<AppLocaleProvider>` và `<AuthProvider>`.
- `src/app/[locale]/page.tsx`: Trang chủ công khai cho `/vi` và `/en`.
- `src/app/[locale]/login/layout.tsx` & `src/app/[locale]/login/page.tsx`: Trang đăng nhập cho `/vi/login` và `/en/login`.
- `src/app/[locale]/register/layout.tsx` & `src/app/[locale]/register/page.tsx`: Trang đăng ký tài khoản cho `/vi/register` và `/en/register`.

### 5.2. Tương thích ngược cho các đường dẫn truyền thống (`/`, `/login`, `/register`)
- Các đường dẫn truyền thống không tiền tố (`/`, `/login`, `/register`) được xử lý tự động bởi `src/proxy.ts`, chuyển hướng `307` sang đường dẫn có tiền tố ngôn ngữ đang hoạt động (`/vi` hoặc `/en`) và **giữ nguyên toàn bộ chuỗi truy vấn (`searchParams`)**.
- Ví dụ:
  - `/login?returnTo=%2Fbat-dong-san&source=nav` (với `NEXT_LOCALE=vi`) $\rightarrow$ `307` tới `/vi/login?returnTo=%2Fbat-dong-san&source=nav`.
  - `/register` (với `NEXT_LOCALE=en`) $\rightarrow$ `307` tới `/en/register`.

---

## 6. Hành vi Proxy / Phân giải Ngôn ngữ và Loại trừ `/api/*` (Proxy Behavior & `/api/*` Exclusions)

Trong Next.js 16.4.2, tệp `src/proxy.ts` đóng vai trò Middleware cấp ứng dụng:

- **Bộ lọc `config.matcher`:** `['/((?!api|_next|_vercel|.*\\..*).*)']`
- **Kiểm tra tường minh đầu hàm `proxy(request)`:**
  - Nếu `pathname.startsWith('/api/')` hoặc `pathname === '/api'` hoặc `pathname.startsWith('/_next/')` hoặc `pathname.startsWith('/_vercel/')` hoặc là tệp tĩnh có phần mở rộng (`/\.[^/]+$/`), trả về `NextResponse.next()` ngay lập tức.
  - Nhờ đó, cả 4 BFF Route Handlers tại `src/app/api/auth/{login,register,logout,me}/route.ts` hoạt động hoàn toàn độc lập, không bao giờ bị chuyển hướng sang `/vi/api/...` hay `/en/api/...`.

---

## 7. Tổ chức Từ điển Dịch thuật (Translation Catalog Organization)

Hai tệp từ điển JSON tập trung tại `frontend/messages/vi.json` và `frontend/messages/en.json` có cấu trúc khóa đồng hình 100% (được kiểm tra kiểu tĩnh qua `export type AppMessages = typeof viMessages` trong `src/i18n/dictionaries.ts`), chia thành 11 không gian tên (namespaces) rõ ràng:

1. `Metadata`: Tiêu đề (`title`) và mô tả (`description`) chuẩn SEO cho Trang chủ, Đăng nhập, Đăng ký.
2. `LanguageSwitcher`: Nhãn trợ năng (`ariaLabel`), tên ngôn ngữ đầy đủ (`Tiếng Việt`, `English`) và viết tắt (`VI`, `EN`).
3. `Navbar`: Tên thương hiệu, phụ đề, liên kết điều hướng (`Trang chủ` / `Home`, `Mua bán` / `For Sale`, `Cho thuê` / `For Rent`), nút xác thực, và huy hiệu vai trò (`BUYER`, `OWNER`, `AGENT`, `ADMIN`).
4. `Footer`: Mô tả nền tảng, các cột liên kết khám phá, dành cho thành viên, thông tin hỗ trợ, bản quyền và điều khoản.
5. `HeroSearch`: Tiêu đề Hero, phụ đề, 3 tab (`Mua bán`/`For Sale`, `Cho thuê`/`For Rent`, `Dự án - Sắp ra mắt`/`Projects - Coming Soon`), nhãn & placeholder cho Tỉnh/Thành phố, Quận/Huyện, Loại BĐS, Khoảng giá (Mua bán & Cho thuê), Diện tích và các ô nhập tùy chỉnh.
6. `CategoryGrid`: Tiêu đề khu vực danh mục, phụ đề, liên kết xem tất cả và 6 thẻ danh mục loại hình bất động sản.
7. `LatestListings`: Huy hiệu tin đã kiểm duyệt, tiêu đề, phụ đề, trạng thái đang tải, trạng thái rỗng, thông báo lỗi tải dữ liệu và bộ đếm số lượng ảnh.
8. `TrustBenefits`: Tiêu đề khu vực giá trị cốt lõi và 3 thẻ lợi ích nền tảng.
9. `OwnerCta`: Huy hiệu, tiêu đề, mô tả và nút kêu gọi hành động dành cho chủ sở hữu & môi giới.
10. `LoginPage`: Toàn bộ nhãn biểu mẫu, placeholder, thông báo lỗi xác thực, ghi chú thời hạn phiên JWT 15 phút, cột giới thiệu bên trái và hộp thoại Quên mật khẩu (GAP-03).
11. `RegisterPage`: Toàn bộ nhãn biểu mẫu, placeholder, ghi chú trường số điện thoại, 3 lựa chọn mục đích sử dụng (`BUYER`, `OWNER`, `AGENT`), lưu ý phân quyền, thông báo lỗi kiểm tra hợp lệ và thông báo thành công.

---

## 8. Trải nghiệm Chuyển đổi Ngôn ngữ trên Desktop và Mobile (Language Switcher UX)

Component `src/components/common/LanguageSwitcher.tsx` được tích hợp nhất quán trên:
- Thanh điều hướng chính (`Navbar`) ở cả chế độ Desktop và thanh điều khiển Mobile.
- Thanh tiêu đề tối giản của trang Đăng nhập (`/[locale]/login`) và trang Đăng ký (`/[locale]/register`).

**Đặc tả kỹ thuật & UX:**
- Hiển thị cặp nút chuyển đổi trực quan `VI` | `EN` bên trong `role="group"` với `aria-label` đa ngôn ngữ.
- Nút ngôn ngữ đang hoạt động có thuộc tính `aria-pressed="true"`, nền màu xanh cổ vịt chủ đạo (`bg-[#0F766E] text-white`).
- Khi người dùng nhấp chuyển ngôn ngữ:
  1. Ghi cookie `NEXT_LOCALE` mới (`max-age=31536000; path=/; SameSite=Lax`) và cập nhật ngay `document.documentElement.setAttribute('lang', targetLocale)` thông qua hàm tiện ích `persistClientLocalePreference()`.
  2. Tính toán URL đích qua `buildLocaleSwitchUrl(pathname, search, targetLocale)`, giữ nguyên tuyến đường logic hiện tại và toàn bộ query string (`?transactionType=...`, `?returnTo=...`).
  3. Điều hướng mượt mà bằng `router.push(nextUrl)`.

---

## 9. Quy tắc Định dạng theo Ngôn ngữ (Localized Formatting Rules)

Tệp `src/lib/formatters.ts` đã được nâng cấp để nhận tham số tùy chọn `locale: AppLocale = 'vi'` (mặc định là `'vi'`, bảo toàn 100% đầu ra của các bài test cũ):

| Hàm định dạng | Đầu ra Tiếng Việt (`locale = 'vi'`) | Đầu ra Tiếng Anh (`locale = 'en'`) |
| :--- | :--- | :--- |
| `formatVndPrice('7800000000')` | `7,8 tỷ` | `7.8B VND` |
| `formatVndPrice('12000000', { transactionType: 'FOR_RENT', rentalPeriod: 'MONTH' })` | `12 triệu/tháng` | `12M VND/month` |
| `formatVndPrice('135000000', { transactionType: 'FOR_RENT', rentalPeriod: 'QUARTER' })` | `135 triệu/quý` | `135M VND/quarter` |
| `formatVndPrice('840000000', { transactionType: 'FOR_RENT', rentalPeriod: 'YEAR' })` | `840 triệu/năm` | `840M VND/year` |
| `formatVndPrice(null)` | `Liên hệ` | `Contact for price` |
| `formatArea(78.5)` | `78,5 m²` | `78.5 m²` |
| `formatPricePerSqm('7800000000', 78.5, 'FOR_SALE')` | `~ 99 tr/m²` | `~ 99M VND/m²` |
| `formatListingDate('2026-10-24T00:00:00.000Z')` | `24/10/2026` | `24 Oct 2026` |
| `getPropertyTypeLabel('APARTMENT')` | `Căn hộ chung cư` | `Apartment` |
| `getTransactionBadgeLabel('FOR_SALE', 'APARTMENT')` | `Bán căn hộ` | `Apartment for Sale` |
| `getTransactionBadgeLabel('FOR_RENT', 'COMMERCIAL')` | `Thuê mặt bằng / VP` | `Commercial for Rent` |

> **Nguyên tắc trung thực dữ liệu:** Mức giá luôn giữ nguyên mệnh giá gốc Việt Nam Đồng (`VND`), tuyệt đối không nhân/chia tỷ giá ngoại tệ giả định. Tiêu đề tin đăng (`title`) và địa danh hành chính (`ward`, `district`, `province`) giữ nguyên văn bản gốc từ cơ sở dữ liệu.

---

## 10. SEO, `<html lang>`, Canonical URLs & `hreflang` theo Môi trường (SEO & Canonical Origin Handling)

Mô-đun `src/i18n/metadata.ts` (`getSiteBaseUrl`, `resolveMetadataUrl`, `buildLocalizedPageMetadata`) xử lý thẻ `<html lang>`, `canonical`, `hreflang` và `openGraph` nhất quán giữa môi trường phát triển cục bộ và môi trường sản xuất (Production):

### 10.1. Cơ chế phân giải Site Origin (`getSiteBaseUrl(env)`)
1. **Khi có cấu hình miền tường minh (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL` hoặc `VERCEL_URL`):**
   - Chuẩn hóa giao thức (`https://` hoặc `http://`) và loại bỏ dấu `/` dư ở cuối.
   - `metadataBase`, `alternates.canonical`, `alternates.languages` (`vi`, `en`, `x-default`) và `openGraph.url` đều phát sinh URL tuyệt đối đồng nhất theo miền cấu hình (ví dụ: `https://<production-domain>/vi`, `https://<production-domain>/en/login`).
2. **Trong môi trường Local Development / Test (`NODE_ENV !== 'production'` và chưa đặt `NEXT_PUBLIC_SITE_URL`):**
   - Tự động fallback về `http://localhost:${PORT || 3000}` (`http://localhost:3000`).
   - Giúp trình duyệt cục bộ hiển thị đầy đủ `canonical` và `hreflang` (`http://localhost:3000/vi`, `http://localhost:3000/en`, ...).
3. **Trong môi trường Production Build (`NODE_ENV === 'production'`) khi CHƯA cấu hình miền sản xuất:**
   - Do Next.js thực hiện Prerendering tĩnh (`next build` với `NODE_ENV=production`) cho `/vi/login`, `/en/login`, `/vi/register`, `/en/register` và vỏ tĩnh của `/vi`, `/en`, nếu fallback cứng về `http://localhost:3000` thì chuỗi `http://localhost:3000` sẽ bị đóng cứng vào HTML bản dựng sản xuất.
   - Vì vậy, khi `NODE_ENV === 'production'` và không có biến môi trường miền nào được cấu hình, `getSiteBaseUrl()` trả về `null` và `resolveMetadataUrl()` xuất đường dẫn tương đối sạch (`/vi`, `/en`, `/vi/login`, `/en/login`, `/vi/register`, `/en/register`), **đảm bảo không bao giờ phát tán `http://localhost:3000` vào mã HTML Production**.

### 10.2. Cấu hình biến môi trường an toàn khi triển khai Production
Đã tài liệu hóa rõ trong tệp `frontend/.env.example`:
```env
# Public site origin used for SEO canonical, hreflang, and OpenGraph URLs (no trailing slash).
# - In production deployment, this MUST be configured with the actual production site origin (e.g. https://batdongsan.example.com).
# - In local development / test, leave this empty because getSiteBaseUrl() automatically falls back to http://localhost:${PORT || 3000}.
# - Production environments must never use localhost as their canonical, hreflang, or OpenGraph origin.
NEXT_PUBLIC_SITE_URL=
```
- **Điều chỉnh an toàn tệp mẫu cấu hình (Template Safety Adjustment):** Giá trị `NEXT_PUBLIC_SITE_URL` được để trống trong tệp ví dụ `frontend/.env.example` thay vì gán giá trị mặc định `http://localhost:3000`. Điều này nhằm loại bỏ hoàn toàn rủi ro người quản trị sao chép nguyên tệp `.env.example` lên máy chủ Production mà quên sửa lại, khiến bản dựng Production bị phát tán origin `localhost`. Khi để trống, `getSiteBaseUrl()` vẫn tự động fallback an toàn về `http://localhost:3000` ở môi trường Local Development (`NODE_ENV !== 'production'`), đồng thời xuất đường dẫn tương đối an toàn trong Production nếu chưa cấu hình miền thực tế.
- **Trạng thái kiểm chứng miền Production thực tế:** **BLOCKED** (Dự án hiện đang chạy cục bộ, chưa có tên miền Production chính thức được cấp phát; logic phân giải thứ tự ưu tiên với `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` đã được kiểm chứng tự động 100% bằng Unit Test trong `src/__tests__/i18n.test.tsx`).

---

## 11. Danh sách Tệp Tạo mới, Chỉnh sửa và Xóa (Files Created, Modified & Removed)

### 11.1. Tệp tạo mới (16 tệp)
1. `frontend/messages/vi.json` — Từ điển giao diện Tiếng Việt hoàn chỉnh.
2. `frontend/messages/en.json` — Từ điển giao diện Tiếng Anh hoàn chỉnh.
3. `frontend/src/i18n/routing.ts` — Cấu hình locale, cookie, định tuyến và các hàm xử lý URL đa ngôn ngữ.
4. `frontend/src/i18n/dictionaries.ts` — Hàm truy xuất từ điển dùng chung cho cả Server và Client Components.
5. `frontend/src/i18n/request.ts` — Cấu hình `getRequestConfig` cho `next-intl/server`.
6. `frontend/src/i18n/index.tsx` — `AppLocaleProvider` và các React hooks `useAppLocale`, `useDictionary`, `useLocalizedHref`.
7. `frontend/src/i18n/metadata.ts` — Bộ khởi tạo Metadata đa ngôn ngữ, `canonical` và `hreflang` phân biệt môi trường Development / Production.
8. `frontend/src/proxy.ts` — Proxy điều hướng đa ngôn ngữ của Next.js 16 và loại trừ `/api/*`.
9. `frontend/src/components/common/LanguageSwitcher.tsx` — Bộ chuyển đổi ngôn ngữ `VI` / `EN`.
10. `frontend/src/app/[locale]/layout.tsx` — Root Layout đa ngôn ngữ.
11. `frontend/src/app/[locale]/page.tsx` — Trang chủ công khai đa ngôn ngữ.
12. `frontend/src/app/[locale]/login/layout.tsx` — Metadata layout cho trang Đăng nhập.
13. `frontend/src/app/[locale]/login/page.tsx` — Trang Đăng nhập đa ngôn ngữ.
14. `frontend/src/app/[locale]/register/layout.tsx` — Metadata layout cho trang Đăng ký.
15. `frontend/src/app/[locale]/register/page.tsx` — Trang Đăng ký đa ngôn ngữ.
16. `frontend/src/__tests__/i18n.test.tsx` — Bộ kiểm thử đơn vị & tích hợp cho nền tảng đa ngôn ngữ (14 bài kiểm thử).

### 11.2. Tệp chỉnh sửa (17 tệp)
1. `frontend/.env.example` — Cập nhật mẫu biến môi trường an toàn `NEXT_PUBLIC_SITE_URL=` (để trống kèm hướng dẫn chi tiết).
2. `frontend/package.json` — Khai báo phụ thuộc `next-intl@^4.14.9`.
3. `frontend/package-lock.json` — Khóa phiên bản cây phụ thuộc `next-intl@^4.14.9`.
4. `frontend/next.config.ts` — Tích hợp `createNextIntlPlugin('./src/i18n/request.ts')`.
5. `frontend/vitest.config.ts` — Cấu hình alias `next/server`, `next/navigation`, `next/headers` và `server.deps.inline: ['next-intl']` cho Vitest.
6. `frontend/src/lib/formatters.ts` — Hỗ trợ định dạng giá VND, diện tích, đơn giá/m², ngày đăng và nhãn loại hình theo `locale` (`vi` / `en`).
7. `frontend/src/components/common/Navbar.tsx` — Đa ngôn ngữ hóa điều hướng, tích hợp `LanguageSwitcher` và `data-testid="mobile-menu-toggle"`.
8. `frontend/src/components/common/Footer.tsx` — Đa ngôn ngữ hóa chân trang.
9. `frontend/src/components/home/HeroSearchBox.tsx` — Đa ngôn ngữ hóa hộp tìm kiếm Hero và bộ lọc.
10. `frontend/src/components/home/CategoryGrid.tsx` — Đa ngôn ngữ hóa lưới danh mục BĐS.
11. `frontend/src/components/home/LatestListingsGrid.tsx` — Đa ngôn ngữ hóa tiêu đề, trạng thái tải, rỗng và lỗi của lưới tin đăng mới nhất.
12. `frontend/src/components/home/ListingCard.tsx` — Đa ngôn ngữ hóa thẻ tin đăng với định dạng giá/diện tích/nhãn theo `locale`.
13. `frontend/src/components/home/TrustBenefits.tsx` — Đa ngôn ngữ hóa khu vực lợi ích nền tảng.
14. `frontend/src/components/home/OwnerCtaBanner.tsx` — Đa ngôn ngữ hóa biểu ngữ kêu gọi đăng ký.
15. `frontend/src/__tests__/HomePage.test.tsx` — Cập nhật đường dẫn import sang `@/app/[locale]/page`.
16. `frontend/src/__tests__/LoginPage.test.tsx` — Cập nhật đường dẫn import sang `@/app/[locale]/login/page`.
17. `frontend/src/__tests__/RegisterPage.test.tsx` — Cập nhật đường dẫn import sang `@/app/[locale]/register/page`.

### 11.3. Tệp gốc không tiền tố đã được di chuyển sang `src/app/[locale]/` (4 tệp)
1. `frontend/src/app/layout.tsx` $\rightarrow$ `frontend/src/app/[locale]/layout.tsx`
2. `frontend/src/app/page.tsx` $\rightarrow$ `frontend/src/app/[locale]/page.tsx`
3. `frontend/src/app/login/page.tsx` $\rightarrow$ `frontend/src/app/[locale]/login/page.tsx`
4. `frontend/src/app/register/page.tsx` $\rightarrow$ `frontend/src/app/[locale]/register/page.tsx`

---

## 12. Kết quả Kiểm thử Tự động (Automated Test Results)

Thực thi tại `D:\Batdongsan\frontend`:

1. **Unit & Integration Tests (`npm test -- --run`):**
   - **Tổng số tệp kiểm thử:** `11 passed (11)`
   - **Tổng số bài kiểm thử:** `83 passed (83)` (`69` bài kiểm thử hiện có + `14` bài kiểm thử mới trong `src/__tests__/i18n.test.tsx` bao phủ định tuyến, tất cả 4 tuyến BFF `/api/auth/*`, formatters, chuyển đổi ngôn ngữ, kiểm tra hợp lệ biểu mẫu Login/Register tiếng Anh, bảo toàn state trong `<AppLocaleProvider>`, và tạo Metadata SEO cùng thứ tự ưu tiên phân giải origin cho cả 3 chế độ môi trường).
2. **Kiểm tra quy tắc mã nguồn (`npm run lint`):**
   - Kết quả: `PASS` (`0 errors`, `0 warnings`).
3. **Bản dựng sản xuất (`npm run build`):**
   - Kết quả: `PASS` (Next.js 16.4.2 Turbopack + TypeScript + Static/Partial Prerendering cho cả `/vi`, `/en`, `/vi/login`, `/en/login`, `/vi/register`, `/en/register`).
4. **Kiểm tra định dạng Git (`git diff --check`):**
   - Kết quả: `PASS` (không có lỗi khoảng trắng thừa hoặc xung đột dòng).

---

## 13. Kết quả Nghiệm thu trên Trình duyệt Chrome Thực tế (Real Browser Verification Results)

Đã khởi chạy đồng thời NestJS Backend (`http://localhost:3001` kết nối PostgreSQL 16) và Next.js Frontend (`http://localhost:3000`), sau đó điều khiển trình duyệt Google Chrome thực tế qua giao thức Chrome DevTools Protocol (CDP):

### 13.1. Kiểm thử Định tuyến Đa ngôn ngữ, Trang chủ, Giao diện Đáp ứng & Dữ liệu Thực tế

| STT | Kịch bản kiểm thử trên Chrome thực tế | Kết quả | Bằng chứng xác thực |
| :--- | :--- | :--- | :--- |
| 1 | `/vi` (Desktop `1440×900` & Mobile `390×844`) | **PASS** | `<html lang="vi">`, `h1="Tìm bất động sản phù hợp với bạn"`, hiển thị 6 tin đăng đã duyệt, giá định dạng `135 triệu/quý`, `3,65 tỷ`, `7,8 tỷ`. Ảnh: `01-vi-home-desktop.png`, `01b-vi-home-desktop-full.png`, `09-vi-home-mobile.png`. |
| 2 | `/en` (Desktop `1440×900` & Mobile `390×844`) | **PASS** | `<html lang="en">`, `h1="Find the Right Property for You"`, toàn bộ nhãn UI bằng tiếng Anh, 6 tin đăng hiển thị giá `135M VND/quarter`, `3.65B VND`, `7.8B VND`, giữ nguyên tiêu đề & địa chỉ gốc. Ảnh: `02-en-home-desktop.png`, `02b-en-home-desktop-full.png`, `07-en-home-mobile.png`. |
| 3 | `/vi/login` (Desktop & Mobile) | **PASS** | `<html lang="vi">`, tiêu đề `Đăng nhập | Batdongsan`, form đăng nhập tiếng Việt đầy đủ. Ảnh: `03-vi-login-desktop.png`. |
| 4 | `/en/login` (Desktop & Mobile) | **PASS** | `<html lang="en">`, tiêu đề `Sign In | Batdongsan`, form đăng nhập tiếng Anh hoàn chỉnh. Ảnh: `04-en-login-desktop.png`, `11-en-login-mobile.png`. |
| 5 | `/vi/register` (Desktop & Mobile) | **PASS** | `<html lang="vi">`, tiêu đề `Đăng ký tài khoản | Batdongsan`, form đăng ký tiếng Việt đầy đủ. Ảnh: `05-vi-register-desktop.png`. |
| 6 | `/en/register` (Desktop & Mobile) | **PASS** | `<html lang="en">`, tiêu đề `Create Account | Batdongsan`, form đăng ký tiếng Anh hoàn chỉnh. Ảnh: `06-en-register-desktop.png`, `12-en-register-mobile.png`. |
| 7 | Tương thích đường dẫn cũ `/`, `/login`, `/register` | **PASS** | Khi xóa cookie (khách lần đầu), truy cập `http://localhost:3000/` tự động chuyển sang `http://localhost:3000/vi` và gán `NEXT_LOCALE=vi`. Khi đang có `NEXT_LOCALE=en`, truy cập `/login` tự động chuyển sang `/en/login`. |
| 8 | Chuyển đổi `VI` $\leftrightarrow$ `EN` trên Trang chủ | **PASS** | Nhấp nút `EN` trên `/vi` điều hướng sang `/en`, `aria-pressed` chuyển sang `"true"` ở nút `EN`, toàn bộ giao diện chuyển sang tiếng Anh tức thì. |
| 9 | Chuyển đổi ngôn ngữ trên `/login` và `/register` | **PASS** | Đang ở `/vi/register` nhấp `EN` chuyển chính xác sang `/en/register`; đang ở `/en/login` nhấp `VI` chuyển chính xác sang `/vi/login`. |
| 10 | Bảo toàn query parameters khi chuyển ngôn ngữ | **PASS** | Truy cập `/en/login?returnTo=%2Fbat-dong-san&source=nav` rồi nhấp `VI` chuyển chính xác sang `/vi/login?returnTo=%2Fbat-dong-san&source=nav`. |
| 11 | Làm mới trang (Refresh) sau khi đổi ngôn ngữ | **PASS** | Sau khi chuyển sang `/en` và gọi `Page.reload`, trình duyệt giữ nguyên `/en`, `<html lang="en">` và cookie `NEXT_LOCALE=en`. |
| 12 | Menu điều hướng Desktop & Mobile mở/đóng ở cả 2 ngôn ngữ | **PASS** | Menu di động mở hiển thị đầy đủ liên kết bằng Tiếng Việt (`Trang chủ`, `Mua bán`, `Cho thuê`, `Đăng nhập`, `Đăng ký`) và Tiếng Anh (`Home`, `For Sale`, `For Rent`, `Sign In`, `Register`). Ảnh: `08-en-home-mobile-menu.png`, `10-vi-home-mobile-menu.png`. |
| 13 | Bố cục đáp ứng (Responsive layout), placeholder, nút bấm | **PASS** | Trên cả `1440×900` và `390×844`, `scrollWidth === clientWidth` (`hasHorizontalOverflow: false`), văn bản tiếng Anh dài hơn không làm vỡ khung. |
| 14 | Dữ liệu thật từ Backend (`GET /api/listings?limit=6`) | **PASS** | Tải đúng 6 bất động sản `APPROVED` từ PostgreSQL 16 trên cả `/vi` và `/en`. |
| 15 | Tải hình ảnh, `<html lang>`, `canonical` và `hreflang` | **PASS** | Toàn bộ ảnh BĐS và ảnh minh họa trang Login/Register tải thành công (`complete: true`, `naturalWidth > 0`); thẻ `<link rel="canonical">` và 3 thẻ `<link rel="alternate" hreflang="vi|en|x-default">` hiển thị chính xác. |
| 16 | Không có lỗi JS runtime, không có lỗi hydration | **PASS** | `consoleErrors: []`, `exceptions: []` trong suốt toàn bộ phiên kiểm thử trình duyệt. |

### 13.2. Kiểm thử Chức năng Tương tác Biểu mẫu Đăng nhập & Đăng ký (`/vi/login`, `/en/login`, `/vi/register`, `/en/register`)

Đã thực thi kịch bản tương tác thực tế trên trình duyệt Chrome (sử dụng dữ liệu kiểm thử không lưu trữ `*.invalid`, không tạo tài khoản rác hay làm thay đổi dữ liệu PostgreSQL):

| Hạng mục kiểm thử chức năng | Tiếng Việt (`/vi/login`, `/vi/register`) | Tiếng Anh (`/en/login`, `/en/register`) | Kết quả |
| :--- | :--- | :--- | :--- |
| **(A) Gửi biểu mẫu Đăng nhập trống** | Hiển thị hộp cảnh báo `role="alert"`: `"Vui lòng nhập đầy đủ email và mật khẩu"` (Ảnh: `13-vi-login-validation-desktop.png`). | Hiển thị hộp cảnh báo `role="alert"`: `"Please enter both your email and password"` (Ảnh: `14-en-login-validation-desktop.png`). | **PASS** |
| **(B1) Đăng ký thiếu Họ và tên** | Hiển thị cảnh báo: `"Vui lòng nhập họ và tên của bạn"`. | Hiển thị cảnh báo: `"Please enter your full name"`. | **PASS** |
| **(B2) Đăng ký mật khẩu ngắn (`< 8` ký tự)** | Hiển thị cảnh báo: `"Mật khẩu phải có ít nhất 8 ký tự"`. | Hiển thị cảnh báo: `"Password must be at least 8 characters long"`. | **PASS** |
| **(B3) Đăng ký mật khẩu xác nhận không khớp** | Hiển thị cảnh báo: `"Mật khẩu xác nhận không khớp"`. | Hiển thị cảnh báo: `"Passwords do not match"`. | **PASS** |
| **(B4) Đăng ký chưa tích đồng ý Điều khoản** | Hiển thị cảnh báo: `"Vui lòng đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư"` (Ảnh: `15-vi-register-validation-desktop.png`). | Hiển thị cảnh báo: `"Please agree to the Terms of Use and Privacy Policy"` (Ảnh: `16-en-register-validation-desktop.png`). | **PASS** |
| **(C) Đồng bộ ngôn ngữ thông báo lỗi & UI** | Toàn bộ nhãn, placeholder, thông báo lỗi và ghi chú hiển thị 100% bằng Tiếng Việt. | Toàn bộ nhãn, placeholder, thông báo lỗi và ghi chú hiển thị 100% bằng Tiếng Anh. | **PASS** |
| **(D) Chuyển đổi ngôn ngữ ngay trên trang Login & Register** | Nhấp `EN` từ `/vi/login?returnTo=%2Fbat-dong-san` chuyển sang `/en/login?returnTo=%2Fbat-dong-san`; nhấp `EN` từ `/vi/register` chuyển sang `/en/register`. | Nhấp `VI` từ `/en/login` chuyển về `/vi/login`; nhấp `VI` từ `/en/register` chuyển về `/vi/register`. Biểu mẫu đích hoạt động đầy đủ. | **PASS** |
| **(E) Nút ẩn/hiện mật khẩu, Checkbox, Radio buttons** | Nút mắt mật khẩu chuyển `type="password"` $\leftrightarrow$ `type="text"`; checkbox `rememberMe` & `agreeTerms` đóng/mở bình thường; radio `BUYER` / `OWNER` / `AGENT` chọn chính xác. | Nút mắt mật khẩu (`Show password` / `Hide password`) chuyển `type="password"` $\leftrightarrow$ `type="text"`; checkbox & 3 radio buttons hoạt động mượt mà. | **PASS** |
| **(F) Hành vi trạng thái biểu mẫu (Form state) khi chuyển ngôn ngữ** | - **Khi re-render cùng Component dưới `<AppLocaleProvider>` (Unit Test):** State điều khiển (`email`, `password`) được giữ nguyên.<br>- **Khi chuyển hướng phân đoạn URL trên trình duyệt (`/vi/login` $\rightarrow$ `/en/login`):** Do điều hướng sang route `[locale]` mới, Next.js mount lại trang đích với biểu mẫu sạch (reset state tạm thời trong bộ nhớ), trong khi **bảo toàn 100% query parameters trên URL (`?returnTo=...`)**. | Hành vi hoàn toàn nhất quán theo thiết kế định tuyến phân đoạn `[locale]`. | **PASS (Ghi nhận rõ hành vi)** |
| **(G) Tạo tài khoản thật / Đột biến dữ liệu xác thực trên DB thật** | Không gửi thông tin đăng ký hợp lệ vào cơ sở dữ liệu PostgreSQL để tuân thủ quy tắc an toàn dữ liệu của nhiệm vụ. | Không tạo user test trong DB thật. | **NOT TESTED (Bỏ qua có chủ đích theo ràng buộc an toàn DB)** |

### 13.3. Kiểm thử Hồi quy Toàn bộ 4 Tuyến BFF Authentication (`/api/auth/*`)

Đã kiểm chứng cả trong bộ kiểm thử tự động (`src/__tests__/i18n.test.tsx`) và bằng lệnh `fetch(..., { redirect: 'manual' })` trực tiếp trong trình duyệt Chrome thực tế:

| Tuyến BFF Route Handler | Phương thức & Payload kiểm thử an toàn | Mã phản hồi HTTP thực tế | `redirected` | URL phản hồi cuối | Kết quả |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `/api/auth/me` | `GET /api/auth/me` (không có cookie phiên) | `401 Unauthorized` | `false` | `http://localhost:3000/api/auth/me` | **PASS** |
| `/api/auth/login` | `POST /api/auth/login` với body `{}` | `400 Bad Request` (từ NestJS ValidationPipe) | `false` | `http://localhost:3000/api/auth/login` | **PASS** |
| `/api/auth/register` | `POST /api/auth/register` với body `{}` | `400 Bad Request` (từ NestJS ValidationPipe) | `false` | `http://localhost:3000/api/auth/register` | **PASS** |
| `/api/auth/logout` | `POST /api/auth/logout` | `200 OK` | `false` | `http://localhost:3000/api/auth/logout` | **PASS** |

### 13.4. Tổng hợp Phân loại Trạng thái Kiểm chứng (`PASS` / `FAIL` / `BLOCKED` / `NOT TESTED`)

| Nhóm hạng mục kiểm chứng | Phân loại | Ghi chú chi tiết |
| :--- | :---: | :--- |
| Định tuyến ngôn ngữ (`/vi`, `/en`, `/vi/login`, `/en/login`, `/vi/register`, `/en/register`) & tương thích ngược (`/`, `/login`, `/register`) | **PASS** | Hoạt động chính xác trên cả Vitest và trình duyệt Chrome thực tế. |
| Chuyển đổi ngôn ngữ Desktop/Mobile, lưu cookie `NEXT_LOCALE`, bảo toàn query string | **PASS** | Đã kiểm chứng thực tế qua CDP trên cả Desktop (`1440×900`) và Mobile (`390×844`). |
| Kiểm thử tương tác biểu mẫu Login & Register (kiểm tra lỗi, ẩn/hiện mật khẩu, checkbox, radio, đổi ngôn ngữ) | **PASS** | Toàn bộ thông báo lỗi hiển thị đúng ngôn ngữ đang chọn (`vi` / `en`). |
| Kiểm thử loại trừ 4 tuyến BFF (`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`) | **PASS** | Cả 4 tuyến đều không bị `src/proxy.ts` chuyển hướng (`redirected: false`). |
| SEO Canonical & `hreflang` trong Local Dev và logic bảo vệ Production Build (`src/i18n/metadata.ts`) | **PASS** | Local Dev xuất `http://localhost:3000/...`; Production Build khi chưa có miền xuất đường dẫn tương đối sạch (`/vi`, `/en/...`), khi có `NEXT_PUBLIC_SITE_URL` xuất URL tuyệt đối theo miền Production. |
| Xác minh trực tiếp trên tên miền Production thực tế (Live Production Domain Origin Verification) | **BLOCKED** | Dự án hiện chưa triển khai lên tên miền Production thực tế. Cần cấu hình `NEXT_PUBLIC_SITE_URL=https://<domain>` khi triển khai Production. |
| Đăng ký tài khoản mới / Đăng nhập ghi phiên thực tế vào PostgreSQL từ trình duyệt | **NOT TESTED** | Không thực hiện theo đúng quy định an toàn: tuyệt đối không tạo tài khoản người dùng thử nghiệm hoặc làm biến đổi dữ liệu cơ sở dữ liệu thật. |
| Các lỗi chưa được xử lý (`FAIL`) | **0 FAIL** | Không có bất kỳ bài kiểm thử tự động hay kịch bản trình duyệt nào thất bại. |

---

## 14. Các Vấn đề Phát hiện trong Quá trình Kiểm thử & Rà soát và Cách Khắc phục (Issues Found & Fixed)

1. **Ranh giới mô-đun Server/Client khi Prerendering trong Next.js 16.4.2 (`getDictionary`):**
   - *Phát hiện:* Ban đầu `getDictionary()` được đặt chung trong `src/i18n/index.tsx` (tệp có chỉ thị `'use client'`). Khi chạy `npm run build`, worker prerender của Next.js 16 báo lỗi không thể gọi hàm từ mô-đun `'use client'` bên trong Server Component (`src/app/[locale]/layout.tsx`).
   - *Khắc phục:* Tách `getDictionary()` và kiểu `AppMessages` sang mô-đun thuần `src/i18n/dictionaries.ts` (không có `'use client'`), sau đó re-export từ `src/i18n/index.tsx`. Bản dựng sản xuất `npm run build` đã thành công hoàn toàn.
2. **Quy tắc ESLint `react-hooks/immutability` trong `LanguageSwitcher.tsx`:**
   - *Phát hiện:* ESLint của React 19 cảnh báo khi gán trực tiếp `document.cookie = ...` và `document.documentElement.lang = ...` bên trong thân component.
   - *Khắc phục:* Đóng gói logic cập nhật cookie và `document.documentElement.setAttribute('lang', targetLocale)` vào hàm tiện ích `persistClientLocalePreference(targetLocale)` trong `src/i18n/routing.ts`. ESLint đạt `0 errors, 0 warnings`.
3. **Hiển thị nút "Back to Home" trên tiêu đề trang Đăng ký ở màn hình di động hẹp (`390px`):**
   - *Phát hiện:* Khi kiểm tra ảnh chụp màn hình `12-en-register-mobile.png`, cụm chữ `"Back to Home"` đứng cạnh `LanguageSwitcher` bị xuống thành 3 dòng hẹp trên màn hình `390px` (trong khi trang Đăng nhập chỉ hiển thị biểu tượng mũi tên quay lại gọn gàng trên mobile).
   - *Khắc phục:* Đồng bộ lớp CSS `hidden sm:inline` cho nhãn văn bản của nút quay lại trang chủ trên `src/app/[locale]/register/page.tsx` giống hệt `src/app/[locale]/login/page.tsx`, giúp thanh tiêu đề trên di động thoáng và cân đối.
4. **Rủi ro đóng cứng `http://localhost:3000` vào thẻ Canonical & `hreflang` khi chạy `next build` (`NODE_ENV=production`) mà chưa cấu hình `NEXT_PUBLIC_SITE_URL`:**
   - *Phát hiện:* Hàm `getSiteBaseUrl()` ban đầu luôn fallback về `'http://localhost:3000'` trong mọi môi trường nếu `NEXT_PUBLIC_SITE_URL` chưa được đặt, dẫn tới nguy cơ xuất `http://localhost:3000` trong HTML tĩnh của bản dựng Production.
   - *Khắc phục:* Cập nhật `getSiteBaseUrl()` và `resolveMetadataUrl()` trong `src/i18n/metadata.ts` để chỉ fallback về `http://localhost:3000` khi `NODE_ENV !== 'production'`. Trong `NODE_ENV === 'production'`, hàm đọc `NEXT_PUBLIC_SITE_URL` / `SITE_URL` / `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`; nếu chưa cấu hình miền thực tế thì trả về `null` và xuất đường dẫn tương đối sạch (`/vi`, `/en/login`, ...). Đồng thời bổ sung `NEXT_PUBLIC_SITE_URL` vào `frontend/.env.example`.
5. **Tooltip kiểm tra hợp lệ mặc định của trình duyệt (HTML5 native validation) chặn thông báo lỗi đa ngôn ngữ tùy chỉnh trên Chrome:**
   - *Phát hiện:* Các ô `<input required>` trong `LoginPage` và `RegisterPage` khiến trình duyệt Chrome hiển thị tooltip mặc định theo ngôn ngữ hệ điều hành khi nhấn Submit biểu mẫu trống, ngăn hàm `handleSubmit` hiển thị hộp cảnh báo đa ngôn ngữ (`dict.LoginPage.errors.emptyFields` / `dict.RegisterPage.errors.*`).
   - *Khắc phục:* Bổ sung thuộc tính `noValidate` vào thẻ `<form>` trong `src/app/[locale]/login/page.tsx` và `src/app/[locale]/register/page.tsx`, giúp trình duyệt luôn kích hoạt bộ kiểm tra hợp lệ đa ngôn ngữ của ứng dụng (hiển thị chính xác bằng Tiếng Việt trên `/vi/*` và Tiếng Anh trên `/en/*`).
6. **Điều chỉnh an toàn tệp mẫu biến môi trường (`frontend/.env.example`):**
   - *Phát hiện:* Trong tệp mẫu `frontend/.env.example`, biến `NEXT_PUBLIC_SITE_URL` ban đầu được gán mẫu bằng `http://localhost:3000`. Điều này tiềm ẩn nguy cơ nếu người triển khai sao chép nguyên tệp sang môi trường Production mà quên thay đổi thì có thể gây nhầm lẫn hoặc kích hoạt cấu hình localhost trong production.
   - *Khắc phục:* Đổi giá trị mẫu thành `NEXT_PUBLIC_SITE_URL=` (để trống), kèm theo chú thích rõ ràng: trong môi trường Production bắt buộc phải cấu hình miền thực tế; trong môi trường Local Development được để trống vì hàm `getSiteBaseUrl()` đã tự động fallback về `http://localhost:3000`. Production tuyệt đối không sử dụng `localhost` làm origin cho Canonical, hreflang, hay OpenGraph. Đồng thời bổ sung ca kiểm thử tự động trong `src/__tests__/i18n.test.tsx` xác minh thứ tự ưu tiên phân giải (`NEXT_PUBLIC_SITE_URL` > `SITE_URL` > `VERCEL_PROJECT_PRODUCTION_URL` > `VERCEL_URL`) và đảm bảo chuỗi rỗng trong Production trả về `null` thay vì fallback localhost.

---

## 15. Hạn chế Còn lại & Khả năng Mở rộng cho Các Giai đoạn Tiếp theo (Extensibility for Future Phases)

- **Chưa triển khai trong Phase 2E-2A.1 (theo đúng ràng buộc phạm vi):**
  - Trang danh sách kết quả tìm kiếm `/[locale]/bat-dong-san` (thuộc **Phase 2E-2B**).
  - Trang chi tiết bất động sản `/[locale]/bat-dong-san/[id]` (thuộc **Phase 2E-2C**).
  - Trợ lý AI Bất động sản (AI Property Concierge Chatbot — sẽ triển khai ở phase riêng biệt sau khi đã có nền tảng ngôn ngữ này).
- **Cách các màn hình tương lai tích hợp vào nền tảng i18n này:**
  1. Tạo route mới bên dưới `src/app/[locale]/...` (ví dụ: `src/app/[locale]/bat-dong-san/page.tsx`).
  2. Bổ sung namespace mới vào `messages/vi.json` và `messages/en.json` (TypeScript sẽ tự động kiểm tra tính đồng nhất khóa giữa 2 ngôn ngữ).
  3. Sử dụng `getDictionary(locale)` trong Server Components hoặc `useDictionary()`, `useAppLocale()`, `useLocalizedHref()` trong Client Components, và truyền `locale` vào các hàm trong `src/lib/formatters.ts`.
  4. Đối với Trợ lý AI trong tương lai, context `useAppLocale()` cung cấp sẵn ngôn ngữ giao diện đang hoạt động (`'vi'` hoặc `'en'`) để gửi kèm làm ngôn ngữ phản hồi mặc định của trợ lý.

---

## 16. Kế hoạch Git Commit Đề xuất Chờ Chủ Dự án Phê duyệt (Proposed Git Commit Plan)

Theo đúng quy định an toàn Git, **chưa có bất kỳ lệnh `git add`, `git commit` hay `git push` nào được thực hiện**. Các tệp nội bộ `backend/check-db-fingerprint.mjs` và `phase2d2-review.patch` được giữ nguyên hoàn toàn ngoài vùng stage.

Khi Chủ dự án phê duyệt, đề xuất thực hiện commit trên nhánh `feat/phase2e2a1-i18n` với thông điệp:

```bash
feat(phase2e2a1): implement Vietnamese and English i18n foundation
```

**Danh sách các tệp sẽ được stage cụ thể (không dùng `git add .`):**
- `frontend/.env.example`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/next.config.ts`
- `frontend/vitest.config.ts`
- `frontend/messages/vi.json`
- `frontend/messages/en.json`
- `frontend/src/i18n/routing.ts`
- `frontend/src/i18n/dictionaries.ts`
- `frontend/src/i18n/request.ts`
- `frontend/src/i18n/index.tsx`
- `frontend/src/i18n/metadata.ts`
- `frontend/src/proxy.ts`
- `frontend/src/lib/formatters.ts`
- `frontend/src/components/common/LanguageSwitcher.tsx`
- `frontend/src/components/common/Navbar.tsx`
- `frontend/src/components/common/Footer.tsx`
- `frontend/src/components/home/HeroSearchBox.tsx`
- `frontend/src/components/home/CategoryGrid.tsx`
- `frontend/src/components/home/LatestListingsGrid.tsx`
- `frontend/src/components/home/ListingCard.tsx`
- `frontend/src/components/home/TrustBenefits.tsx`
- `frontend/src/components/home/OwnerCtaBanner.tsx`
- `frontend/src/app/[locale]/layout.tsx`
- `frontend/src/app/[locale]/page.tsx`
- `frontend/src/app/[locale]/login/layout.tsx`
- `frontend/src/app/[locale]/login/page.tsx`
- `frontend/src/app/[locale]/register/layout.tsx`
- `frontend/src/app/[locale]/register/page.tsx`
- `frontend/src/app/layout.tsx` (deleted)
- `frontend/src/app/page.tsx` (deleted)
- `frontend/src/app/login/page.tsx` (deleted)
- `frontend/src/app/register/page.tsx` (deleted)
- `frontend/src/__tests__/HomePage.test.tsx`
- `frontend/src/__tests__/LoginPage.test.tsx`
- `frontend/src/__tests__/RegisterPage.test.tsx`
- `frontend/src/__tests__/i18n.test.tsx`
- `docs/reports/PHASE2E2A1_MULTILINGUAL_FOUNDATION_PROGRESS_2026-11-03.md`
