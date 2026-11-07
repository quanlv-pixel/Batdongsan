# BÁO CÁO NGHIỆM THU TRÌNH DUYỆT THỰC TẾ & ĐỐI CHIẾU GIAO DIỆN STITCH — PHASE 2E-2A (PUBLIC HOMEPAGE)
*(Bản hiệu đính xác thực toàn diện theo mã nguồn thực tế, log tiến trình máy chủ và ảnh chụp trình duyệt Chrome — Final Browser Test Source-of-Truth Reconciliation)*

- **Dự án:** Hệ thống Bất động sản (`D:\Batdongsan`)
- **Phase kiểm thử:** Phase 2E-2A — Local Browser Smoke Test & Stitch Visual Acceptance
- **Ngày thực hiện & hiệu đính:** `2026-11-03`
- **Nhánh Git kiểm thử:** `feat/phase2e2-public-listings`
- **Commit HEAD cơ sở:** `aa514d0` (`feat(phase2e2a): implement public homepage and listing formatters`)
- **Remote tracking branch:** `origin/feat/phase2e2-public-listings`
- **Stitch Project ID:** `13967597418813716400`
- **Stitch Homepage Screen ID:** `b9d3227abd6248c59bcf0080b813e73f` (*Trang chủ Batdongsan - Desktop*)

> **Ghi chú đối chiếu & hiệu đính báo cáo (Source-of-Truth Reconciliation):**
> Trong bản nháp báo cáo đầu tiên được viết ngay sau bước nén ngữ cảnh tự động (*context compaction*), phần mô tả văn bản đã ghi nhầm một số đường dẫn component và thông số từ bản tóm tắt ngữ cảnh (như `components/layout/Navbar.tsx`, `FeaturedCategories.tsx` 4 thẻ, `WhyChooseUsSection.tsx`, `PartnerBrands.tsx`, `app/(auth)/login/page.tsx`, mã màu `#d4af37`, và tên bản ghi seed cũ).
> Tuy nhiên, **kết quả kiểm tra đối chứng trực tiếp trên đĩa cứng, nhật ký tiến trình (`task-4291.log`, `task-4293.log`), tệp kết quả CDP (`browser-verify-report.json`) và 7 ảnh chụp màn hình PNG thực tế** chứng minh rằng trình duyệt Chrome đã kết nối và chụp ảnh trực tiếp từ ứng dụng thực tế tại `D:\Batdongsan\frontend` (commit `aa514d0`). Bản báo cáo này đã được hiệu đính toàn bộ để khớp chính xác 100% với mã nguồn thực tế và bằng chứng ảnh chụp màn hình.

---

## 1. Git Baseline & Trạng thái Môi trường

### 1.1. Xác minh Git Baseline & Cây thư mục
- **`git branch --show-current`**: `feat/phase2e2-public-listings`
- **`git log -1 --oneline`**: `aa514d0 feat(phase2e2a): implement public homepage and listing formatters`
- **`git status -sb`**:
  ```text
  ## feat/phase2e2-public-listings...origin/feat/phase2e2-public-listings
   M frontend/src/__tests__/ListingCard.test.tsx
   M frontend/src/app/globals.css
   M frontend/src/app/layout.tsx
   M frontend/src/components/home/HeroSearchBox.tsx
   M frontend/src/components/home/LatestListingsGrid.tsx
   M frontend/src/components/home/ListingCard.tsx
  ?? backend/check-db-fingerprint.mjs
  ?? docs/reports/PHASE2E2A_LOCAL_BROWSER_ACCEPTANCE_2026-11-03.md
  ?? phase2d2-review.patch
  ```
- **`git diff --check`**: Sạch (`0` lỗi khoảng trắng/EOF).
- **`git diff --cached --name-only`**: Rỗng (`0` tệp được stage).
- **Bảo toàn tệp nội bộ untracked**: Hai tệp `backend/check-db-fingerprint.mjs` và `phase2d2-review.patch` được giữ nguyên vẹn, không đọc nội dung nhạy cảm, không stage, không xóa và không chỉnh sửa.

### 1.2. Kiểm kê Chính xác Cây Component & Route Thực tế trên Đĩa (`D:\Batdongsan\frontend`)

Kết quả chạy `git ls-files frontend/src/components`, `git ls-files frontend/src/app` và `Test-Path`:

| Đường dẫn trong Repository | Trạng thái tồn tại (`Test-Path`) | Trạng thái Git | Vai trò thực tế |
|---|:---:|:---:|---|
| [`frontend/src/components/common/Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) | `True` | Tracked | Thanh điều hướng chung toàn cục (`Trang chủ`, `Mua bán`, `Cho thuê`, `Đăng nhập`, `Đăng ký`) |
| [`frontend/src/components/common/Footer.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx) | `True` | Tracked | Chân trang 4 cột nền `#1E293B` |
| [`frontend/src/components/home/HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx) | `True` | Tracked (`M`) | Khung tìm kiếm Hero (3 tab `Mua bán`, `Cho thuê`, `Dự án [Sắp ra mắt]`, 5 bộ lọc chính + 4 ô khoảng giá/diện tích tùy chỉnh) |
| [`frontend/src/components/home/CategoryGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx) | `True` | Tracked | Lưới **6 danh mục bất động sản** ánh xạ 1–1 với enum `PropertyType` |
| [`frontend/src/components/home/LatestListingsGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx) | `True` | Tracked (`M`) | Khu vực `"Bất động sản mới nhất"` hiển thị lưới 3 cột cùng trạng thái Loading/Error/Empty |
| [`frontend/src/components/home/ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx) | `True` | Tracked (`M`) | Thẻ hiển thị từng bất động sản công khai đã duyệt (`APPROVED`) |
| [`frontend/src/components/home/TrustBenefits.tsx`](file:///d:/Batdongsan/frontend/src/components/home/TrustBenefits.tsx) | `True` | Tracked | Khu vực `"Nền tảng giao dịch bất động sản an tâm & hiệu quả"` (3 thẻ lợi ích) |
| [`frontend/src/components/home/OwnerCtaBanner.tsx`](file:///d:/Batdongsan/frontend/src/components/home/OwnerCtaBanner.tsx) | `True` | Tracked | Banner kêu gọi hành động `"Bạn muốn đăng bán hoặc cho thuê bất động sản?"` |
| [`frontend/src/app/page.tsx`](file:///d:/Batdongsan/frontend/src/app/page.tsx) | `True` | Tracked | Trang chủ công khai `/` (`HomePage`, `HomePageShell`, `LatestListingsSection`) |
| [`frontend/src/app/login/page.tsx`](file:///d:/Batdongsan/frontend/src/app/login/page.tsx) | `True` | Tracked | Trang đăng nhập `/login` (không nằm trong route group `(auth)`) |
| [`frontend/src/app/register/page.tsx`](file:///d:/Batdongsan/frontend/src/app/register/page.tsx) | `True` | Tracked | Trang đăng ký `/register` (không nằm trong route group `(auth)`) |
| `frontend/src/components/layout/Navbar.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước |
| `frontend/src/components/layout/Footer.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước |
| `frontend/src/components/home/FeaturedCategories.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước (thực tế là `CategoryGrid.tsx`) |
| `frontend/src/components/home/WhyChooseUsSection.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước (thực tế là `TrustBenefits.tsx`) |
| `frontend/src/components/home/PartnerBrands.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước (thực tế là `OwnerCtaBanner.tsx`) |
| `frontend/src/app/(auth)/login/page.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước (thực tế là `frontend/src/app/login/page.tsx`) |
| `frontend/src/app/(auth)/register/page.tsx` | `False` | Không tồn tại | Đường dẫn ghi nhầm trong bản nháp báo cáo trước (thực tế là `frontend/src/app/register/page.tsx`) |

### 1.3. Trạng thái Dịch vụ PostgreSQL & Cấu hình Môi trường
- **Dịch vụ Windows PostgreSQL (`postgresql-x64-16`)**: `Status: Running`, `StartType: Automatic`.
- **Biến môi trường Backend ([`backend/.env`](file:///d:/Batdongsan/backend/.env))**:
  - Các khóa có mặt (ẩn giá trị nhạy cảm): `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `NODE_ENV`.
  - Cấu hình cổng & CORS: `PORT="3001"`, `CORS_ORIGIN="http://localhost:3000"`, `NODE_ENV="development"`.
- **Cấu hình URL Backend phía Frontend ([`frontend/src/lib/server-config.ts`](file:///d:/Batdongsan/frontend/src/lib/server-config.ts#L5-L11))**:
  - Hàm [`getBackendBaseUrl()`](file:///d:/Batdongsan/frontend/src/lib/server-config.ts#L5-L11) trả về `process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'`.

---

## 2. Kết quả Khởi chạy Backend & Kiểm tra Endpoint Thật (`GET /api/listings?limit=6`)

- **Tiến trình Backend (`task-4291`)**:
  - **Lệnh thực thi**: `cd d:\Batdongsan\backend; npm run start` (`nest start`)
  - **Process ID (PID) ghi nhận trong log**: `26572`
  - **Cổng lắng nghe**: `Backend listening on http://localhost:3001` (đã dừng an toàn sau khi hoàn tất phiên kiểm thử trình duyệt để giải phóng cổng `3001`).
- **Kiểm tra Endpoint thực tế**: `GET http://localhost:3001/api/listings?limit=6`
  - **HTTP Status**: `200 OK`
  - **`meta`**: `{"total":6,"page":1,"limit":6,"totalPages":1}`
  - **Số lượng bản ghi trả về**: `6` bản ghi có `status: "APPROVED"` sắp xếp theo `createdAt: 'desc'` (`seed_listing_06` → `seed_listing_01`). Các bản ghi `PENDING` (`seed_listing_07`, `seed_listing_08`), `DRAFT` (`seed_listing_09`) và `REJECTED` (`seed_listing_10`) trong cơ sở dữ liệu được lọc bỏ hoàn toàn.
  - **Bảo mật dữ liệu nhạy cảm**: Các trường riêng tư (`streetAddress`, `latitude`, `longitude`, `ownerId`, `owner`) hoàn toàn không có mặt trong JSON trả về.

| Thứ tự hiển thị | ID (`seed.ts`) | Tiêu đề thực tế từ PostgreSQL & hiển thị trên Chrome | Loại BĐS (`propertyType`) | Giao dịch (`transactionType`) | Giá hiển thị (`priceVnd` / `rentalPeriod`) | Đơn giá `/m²` | Diện tích (`areaSqm`) | Địa chỉ hành chính (`ward, district, province`) | Số ảnh |
|:---:|---|---|---|---|---|---|---|---|---|
| 1 | `seed_listing_06` | Mặt bằng kinh doanh mặt tiền đường Trần Hưng Đạo, thanh toán theo quý | `COMMERCIAL` (*Thương mại / Văn phòng*) | `FOR_RENT` (*Thuê mặt bằng / VP*) | `135 triệu/quý` (`135000000` / `QUARTER`) | *(Ẩn với tin cho thuê)* | `160 m²` | Phường An Hải Tây, Quận Hải Châu, Đà Nẵng | 1 |
| 2 | `seed_listing_05` | Đất nền khu đô thị sinh thái Hòa Xuân ven sông Cẩm Lệ | `LAND` (*Đất nền*) | `FOR_SALE` (*Bán đất nền*) | `3,65 tỷ` (`3650000000`) | `~ 37 tr/m²` | `100 m²` | Phường Hòa Xuân, Quận Cẩm Lệ, Đà Nẵng | 1 |
| 3 | `seed_listing_04` | Biệt thự đơn lập Ciputra Tây Hồ, hợp đồng thuê theo năm | `VILLA` (*Biệt thự*) | `FOR_RENT` (*Thuê biệt thự*) | `840 triệu/năm` (`840000000` / `YEAR`) | *(Ẩn với tin cho thuê)* | `300 m²` | Phường Xuân Đỉnh, Quận Bắc Từ Liêm, Hà Nội | 1 |
| 4 | `seed_listing_03` | Căn hộ dịch vụ studio hiện đại gần Hồ Tây, view thoáng | `APARTMENT` (*Căn hộ chung cư*) | `FOR_RENT` (*Thuê căn hộ*) | `12 triệu/tháng` (`12000000` / `MONTH`) | *(Ẩn với tin cho thuê)* | `42 m²` | Phường Quảng An, Quận Tây Hồ, Hà Nội | 1 |
| 5 | `seed_listing_02` | Nhà phố liền kề Khu Đô Thị Phú Mỹ Hưng, nội thất cao cấp | `HOUSE` (*Nhà ở*) | `FOR_SALE` (*Bán nhà ở*) | `22,5 tỷ` (`22500000000`) | `~ 80 tr/m²` | `280 m²` | Phường Tân Phong, Quận 7, TP. Hồ Chí Minh | 2 (`2 ảnh`) |
| 6 | `seed_listing_01` | Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River | `APARTMENT` (*Căn hộ chung cư*) | `FOR_SALE` (*Bán căn hộ*) | `7,8 tỷ` (`7800000000`) | `~ 99 tr/m²` | `78,5 m²` | Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh | 2 (`2 ảnh`) |

---

## 3. Bằng chứng Xác thực Tiến trình Next.js Frontend (`http://localhost:3000`)

- **Nhật ký tiến trình thực tế (`task-4293.log`)**:
  - **Lệnh thực thi**: `cd d:\Batdongsan\frontend; npm run dev` (`frontend@0.1.0 dev` → `next dev`)
  - **Thư mục làm việc**: `D:\Batdongsan\frontend`
  - **Phiên bản in ra khi khởi động**: `▲ Next.js 16.4.2 (Turbopack)`
  - **Địa chỉ lắng nghe**: `- Local: http://localhost:3000`
  - **Các cờ tính năng hoạt động**: `Cache Components enabled`, `Partial Prefetching enabled`
  - **Trạng thái hiện tại của cổng `3000`**: Tiến trình `task-4293` đã được dừng chủ động lúc `17:09:43+07:00` sau khi hoàn thành chụp ảnh màn hình và thu thập dữ liệu CDP; kiểm tra `Get-NetTCPConnection -LocalPort 3000,3001` xác nhận không có tiến trình lạ chiếm cổng.
- **Bằng chứng khớp tuyệt đối giữa tiến trình `D:\Batdongsan\frontend` và trình duyệt Chrome (`browser-verify-report.json`)**:
  1. **URL & Page Title**:
     - Trang chủ: `url: "http://localhost:3000/"`, `title: "Batdongsan – Tìm kiếm & Quản lý Bất động sản"` (khớp chính xác `metadata.title.default` tại [`frontend/src/app/layout.tsx`](file:///d:/Batdongsan/frontend/src/app/layout.tsx#L15)).
     - Trang đăng nhập: `url: "http://localhost:3000/login"`, `h1: "Chào mừng bạn trở lại"`.
     - Trang đăng ký: `url: "http://localhost:3000/register"`, `h1: "Bắt đầu hành trình cùng Batdongsan"`.
  2. **Turbopack Chunk Paths**: Trong `browser-verify-report.json`, trình duyệt tải các chunk biên dịch trực tiếp từ mã nguồn của `D:\Batdongsan\frontend`:
     - `http://localhost:3000/_next/static/chunks/src_app_login_page_tsx_1cddrpaleivhr._.js`
     - `http://localhost:3000/_next/static/chunks/src_app_register_page_tsx_1uv5-_9fb06wn._.js`
  3. **Dữ liệu DOM trích xuất trực tiếp từ Chrome (`browser-verify-report.json` dòng 828–958)**:
     - `h1Text`: `"Tìm bất động sản phù hợp với bạn"`
     - `navLinks`: `Trang chủ` (`/`), `Mua bán` (`/bat-dong-san?transactionType=FOR_SALE`), `Cho thuê` (`/bat-dong-san?transactionType=FOR_RENT`)
     - `categoryLinksCount`: `7` (1 liên kết `"Xem tất cả bất động sản"` + **6 thẻ danh mục** ứng với `APARTMENT`, `HOUSE`, `LAND`, `VILLA`, `COMMERCIAL`, `OTHER`)
     - `listingCardsCount`: `6` (khớp chính xác 6 tiêu đề và 6 mức giá của `seed_listing_06` → `seed_listing_01`).

---

## 4. Xác minh Các Tệp Ảnh Chụp Màn hình & Kết quả Hiển thị Thực tế

### 4.1. Kiểm kê Tệp Ảnh Chụp Màn hình Thực tế
Toàn bộ 8 tệp hình ảnh đều tồn tại thực tế tại thư mục Artifact `C:\Users\Asus\.gemini\antigravity\brain\6faa8008-c0c1-45ef-8ecf-6d64a84e6d21\`:

| Tên tệp | Kích thước (`Length`) | Thời gian ghi (`LastWriteTime`) | Nội dung xác thực |
|---|---:|---|---|
| `stitch-homepage-reference.jpg` | `328,302` bytes | `2026-11-03 17:00:07` | Ảnh thiết kế tham chiếu tải từ Google Stitch (`b9d3227abd6248c59bcf0080b813e73f`) |
| `desktop-homepage-viewport.png` | `123,213` bytes | `2026-11-03 17:08:26` | Ảnh chụp Chrome thật tại `http://localhost:3000/` khung nhìn Desktop `1440×900` |
| `desktop-homepage-full.png` | `1,133,221` bytes | `2026-11-03 17:08:27` | Ảnh chụp Chrome thật toàn trang `http://localhost:3000/` ở chiều rộng Desktop `1440px` |
| `mobile-homepage-viewport.png` | `141,407` bytes | `2026-11-03 17:08:28` | Ảnh chụp Chrome thật tại `http://localhost:3000/` khung nhìn Mobile `390×844` |
| `mobile-homepage-full.png` | `1,049,167` bytes | `2026-11-03 17:08:28` | Ảnh chụp Chrome thật toàn trang `http://localhost:3000/` ở chiều rộng Mobile `390px` |
| `mobile-homepage-menu-open.png` | `54,657` bytes | `2026-11-03 17:08:29` | Ảnh chụp Chrome thật tại `http://localhost:3000/` (`390×844`) khi mở menu điều hướng Mobile |
| `desktop-login-viewport.png` | `268,303` bytes | `2026-11-03 17:08:32` | Ảnh chụp Chrome thật tại `http://localhost:3000/login` khung nhìn Desktop `1440×900` |
| `desktop-register-viewport.png` | `291,465` bytes | `2026-11-03 17:08:34` | Ảnh chụp Chrome thật tại `http://localhost:3000/register` khung nhìn Desktop `1440×900` |

````carousel
![Thiết kế gốc Google Stitch (Screen b9d3227abd6248c59bcf0080b813e73f)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/stitch-homepage-reference.jpg)
<!-- slide -->
![Homepage Desktop Viewport 1440x900 (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/desktop-homepage-viewport.png)
<!-- slide -->
![Homepage Desktop Full Page (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/desktop-homepage-full.png)
<!-- slide -->
![Homepage Mobile Viewport 390x844 (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/mobile-homepage-viewport.png)
<!-- slide -->
![Homepage Mobile Menu Open 390x844 (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/mobile-homepage-menu-open.png)
<!-- slide -->
![Homepage Mobile Full Page (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/mobile-homepage-full.png)
````

### 4.2. Cấu trúc Thực tế của Trang chủ `/` ([`frontend/src/app/page.tsx`](file:///d:/Batdongsan/frontend/src/app/page.tsx))

Trang chủ [`HomePage`](file:///d:/Batdongsan/frontend/src/app/page.tsx#L37-L61) kết xuất chính xác 7 khu vực theo thứ tự từ trên xuống dưới:

1. **[`Navbar`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) (`frontend/src/components/common/Navbar.tsx`)**:
   - Bên trái: Biểu tượng `domain` trong hộp bo góc nền `bg-teal-50` màu `#0F766E`, tiêu đề `Batdongsan` (`#142B4A`) và phụ đề `HỆ THỐNG THÔNG TIN` (`#64748B`).
   - Chính giữa (Desktop): **3 liên kết điều hướng hợp lệ**: `Trang chủ` (`/`), `Mua bán` (`/bat-dong-san?transactionType=FOR_SALE`), `Cho thuê` (`/bat-dong-san?transactionType=FOR_RENT`).
   - Bên phải: Khi chưa đăng nhập hiển thị liên kết `Đăng nhập` (`/login`) và nút `Đăng ký` (`/register`, nền `#0F766E`). Trên Mobile (`<768px`) hiển thị nút hamburger (`aria-label="Toggle navigation menu"`) mở menu thả xuống chứa đầy đủ 3 liên kết điều hướng và 2 nút xác thực.
2. **[`HeroSearchBox`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx) (`frontend/src/components/home/HeroSearchBox.tsx`)**:
   - Nền chuyển sắc sáng (`bg-gradient-to-b from-[#F1F5F9] to-[#F8FAFC]`), tiêu đề `H1` `"Tìm bất động sản phù hợp với bạn"` (`42px`, `#142B4A`) và phụ đề `"Khám phá nơi ở lý tưởng và cơ hội đầu tư phù hợp với nhu cầu của bạn."`.
   - Khung tìm kiếm `max-w-6xl` gồm 3 tab: `Mua bán` (`FOR_SALE`), `Cho thuê` (`FOR_RENT`), và tab `Dự án` kèm nhãn `SẮP RA MẮT` ở trạng thái `disabled`.
   - Hàng bộ lọc chính (6 cột): `Tỉnh / Thành phố` (input text), `Quận / Huyện` (input text), `Loại bất động sản` (select 6 giá trị `PropertyType`), `Khoảng giá` (select preset tự động đổi giữa mức giá bán và mức giá thuê), `Diện tích` (select preset), và nút `Tìm kiếm` (`bg-[#0F766E]`).
   - Hàng bộ lọc phụ (4 cột): `Giá tối thiểu (VNĐ)`, `Giá tối đa (VNĐ)`, `Diện tích tối thiểu (m²)`, `Diện tích tối đa (m²)`.
3. **[`CategoryGrid`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx) (`frontend/src/components/home/CategoryGrid.tsx`)**:
   - Tiêu đề `"Khám phá bất động sản"`, liên kết `"Xem tất cả bất động sản"` (`/bat-dong-san`), và lưới **6 thẻ danh mục** (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`) ánh xạ 1–1 tới 6 giá trị enum `PropertyType`:
     1. `Căn hộ chung cư` (`APARTMENT`) — *Chung cư & căn hộ dịch vụ*
     2. `Nhà ở & Nhà phố` (`HOUSE`) — *Nhà riêng lẻ & nhà mặt phố*
     3. `Đất nền` (`LAND`) — *Đất thổ cư & đất phân lô*
     4. `Biệt thự` (`VILLA`) — *Biệt thự đơn lập & song lập*
     5. `Văn phòng & Thương mại` (`COMMERCIAL`) — *Mặt bằng & tòa nhà văn phòng*
     6. `Loại hình khác` (`OTHER`) — *Kho xưởng & bất động sản khác*
4. **[`LatestListingsSection`](file:///d:/Batdongsan/frontend/src/app/page.tsx#L16-L31) → [`LatestListingsGrid`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx) & [`ListingCard`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx)**:
   - Nhãn `"TIN ĐĂNG ĐÃ KIỂM DUYỆT"`, tiêu đề `"Bất động sản mới nhất"`, liên kết `"Xem tất cả tin đăng"` (`/bat-dong-san`).
   - Lưới 3 cột (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) hiển thị 6 thẻ bất động sản `APPROVED` lấy trực tiếp từ PostgreSQL qua `GET /api/listings?limit=6`.
   - Mỗi thẻ hiển thị: ảnh đại diện + badge loại giao dịch (`bg-[#0F766E]/95`), bộ đếm số ảnh (`2 ảnh` nếu có nhiều hơn 1 ảnh), giá tiền màu `#0F766E`, đơn giá `~ ... tr/m²` (chỉ hiển thị cho tin `FOR_SALE`), tiêu đề liên kết tới `/bat-dong-san/${listing.id}`, diện tích (`square_foot`), loại hình BĐS (`home_work`), địa chỉ hành chính (`ward, district, province`) và ngày đăng (`24/10/2026`).
5. **[`TrustBenefits`](file:///d:/Batdongsan/frontend/src/components/home/TrustBenefits.tsx) (`frontend/src/components/home/TrustBenefits.tsx`)**:
   - Tiêu đề `"Nền tảng giao dịch bất động sản an tâm & hiệu quả"` và 3 thẻ lợi ích trên nền trắng viền `#E2E8F0`: `Tìm kiếm thuận tiện` (`tune`), `Thông tin minh bạch` (`verified_user`), `Quản lý tin đăng chuyên nghiệp` (`hub`).
6. **[`OwnerCtaBanner`](file:///d:/Batdongsan/frontend/src/components/home/OwnerCtaBanner.tsx) (`frontend/src/components/home/OwnerCtaBanner.tsx`)**:
   - Khung chuyển sắc `bg-gradient-to-r from-teal-50 via-[#F1F5F9] to-slate-100` với nhãn `"Dành riêng cho chủ nhà & môi giới"`, tiêu đề `"Bạn muốn đăng bán hoặc cho thuê bất động sản?"` và nút `"Đăng ký tài khoản ngay"` (`/register`, nền `#0F766E`).
7. **[`Footer`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx) (`frontend/src/components/common/Footer.tsx`)**:
   - Nền tối `bg-[#1E293B]`, bố cục 4 cột:
     - Cột 1: Thương hiệu `Batdongsan` và mô tả nền tảng tích hợp MLS.
     - Cột 2 (`Khám phá bất động sản`): 4 liên kết (`Bất động sản Mua bán`, `Bất động sản Cho thuê`, `Căn hộ chung cư`, `Nhà ở & Nhà phố`).
     - Cột 3 (`Dành cho khách hàng`): 3 liên kết (`Trang chủ hệ thống`, `Truy cập tài khoản`, `Mở tài khoản thành viên`).
     - Cột 4 (`Hỗ trợ`): Email `hotro@batdongsan.local` và giờ làm việc `Thứ 2 - Thứ 6 (8h00 - 18h00)`.
   - Thanh bản quyền: `© 2026 Batdongsan. Nền tảng học thuật phục vụ đồ án công nghệ thông tin.` và 3 mục `Quy chế hoạt động • Chính sách bảo mật • Điều khoản dịch vụ`.

---

## 5. Kết quả Kiểm tra `/login` và `/register`

````carousel
![Trang Đăng nhập /login Desktop 1440x900 (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/desktop-login-viewport.png)
<!-- slide -->
![Trang Đăng ký /register Desktop 1440x900 (Thực tế trên Chrome)](C:/Users/Asus/.gemini/antigravity/brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/desktop-register-viewport.png)
````

- **`/login` ([`frontend/src/app/login/page.tsx`](file:///d:/Batdongsan/frontend/src/app/login/page.tsx))**:
  - Header riêng có logo `Batdongsan`, badge `"Dữ liệu minh họa"` và liên kết `"Quay lại Trang chủ"`.
  - Bố cục thẻ 2 cột căn giữa (`max-w-5xl mx-auto`): cột trái hiển thị ảnh kiến trúc kèm thông điệp `"Chào mừng bạn trở lại"` và 3 lợi ích; cột phải hiển thị biểu mẫu `"Đăng nhập"` (`Email`, `Mật khẩu`, `"Ghi nhớ đăng nhập"` kèm chú thích hiệu lực phiên 15 phút, nút `"Đăng nhập"` màu `#0F766E`). Không tràn ngang (`hasHorizontalOverflow: false`).
- **`/register` ([`frontend/src/app/register/page.tsx`](file:///d:/Batdongsan/frontend/src/app/register/page.tsx))**:
  - Header riêng có logo `Batdongsan` và liên kết `"Về trang chủ"`.
  - Bố cục thẻ 2 cột căn giữa: cột trái hiển thị ảnh kiến trúc và `"Bắt đầu hành trình cùng Batdongsan"`; cột phải hiển thị biểu mẫu `"Tạo tài khoản"` (`Họ và tên`, `Email`, `Số điện thoại (không bắt buộc)` kèm chú thích minh bạch, `Mật khẩu`, `Xác nhận mật khẩu`, và 3 lựa chọn `Mục đích sử dụng chính`: `Tìm mua hoặc thuê`, `Đăng tin bất động sản`, `Hoạt động môi giới`). Không tràn ngang (`hasHorizontalOverflow: false`).

---

## 6. Kết quả Kiểm tra Console & Network (`browser-verify-report.json`)

| Hạng mục kiểm tra | Trạng thái | Chi tiết thực tế từ `browser-verify-report.json` |
|---|---|---|
| `exceptions` (`Runtime.exceptionThrown`) | **ĐẠT (`0` lỗi)** | Mảng `exceptions: []` rỗng hoàn toàn trên cả `/`, `/login`, `/register`. |
| Hydration / React Runtime Error | **ĐẠT (`0` lỗi)** | Không có lỗi lệch SSR/CSR hydration. |
| LCP / Next Image Console Warnings | **ĐẠT (`0` cảnh báo)** | Sau khi gắn `priority={index < 3}` (`loading="eager"`) và `unoptimized`, cảnh báo LCP và lỗi `504` biến mất hoàn toàn trong lần chạy kiểm chứng cuối. |
| `GET /api/listings?limit=6` (SSR) | **ĐẠT (`200 OK`)** | Server Component lấy thành công 6 bản ghi `APPROVED` từ `http://localhost:3001/api/listings?limit=6`. |
| `GET /api/auth/me` (CSR Session Probe) | **ĐẠT (`401 Unauthorized` kỳ vọng)** | Khi trình duyệt chưa đăng nhập (không có cookie `bds_access_token`), route `/api/auth/me` trả về `401` đúng thiết kế; `AuthContext` xử lý êm ái và hiển thị nút `Đăng nhập` / `Đăng ký`. |
| Tải ảnh BĐS (`images.unsplash.com`) | **ĐẠT (`200 OK`, `image/avif`)** | Cả 6/6 ảnh thẻ BĐS trên `/` đều có `complete: true, naturalWidth: 1000, renderedWidth: 387, renderedHeight: 224`, `fallbacksCount: 0`. |
| Tải Google Fonts (`Be Vietnam Pro` & `Material Symbols Outlined`) | **ĐẠT (`200 OK`, `font/woff2`)** | Toàn bộ các tệp `.woff2` tải thành công (`status: 200`). |

---

## 7. Đối chiếu Thiết kế Google Stitch (`b9d3227abd6248c59bcf0080b813e73f`) & Đồng bộ Design Tokens

### 7.1. Đối chiếu Design Tokens (Global Design System vs. Stitch Homepage HTML vs. Rendered CSS)

Trong dự án, **không hề có màu vàng kim `#D4AF37` hay xanh dương `#0066CC`**. Sự khác biệt giữa `#0F766E` và `#142B4A` là sự phân vai giữa **Màu nhấn thương hiệu / CTA (`--color-primary`)** và **Màu chữ / tiêu đề đậm (`--color-navy`)**:

| Vai trò Token | Stitch Homepage HTML (`b9d3227abd6248c59bcf0080b813e73f`) | Khai báo trong [`globals.css`](file:///d:/Batdongsan/frontend/src/app/globals.css) & Tailwind classes | Giá trị Computed CSS thực tế trên Chrome (`browser-verify-report.json`) |
|---|---|---|---|
| **Primary / Brand Accent (Nút CTA, Tab active, Giá tiền, Icon chủ đạo)** | `"primary-container": "#0f766e"`, `"primary": "#005c55"` (Deep Teal) | `--color-primary: #0F766E`, `--color-primary-600: #0D6660`, `bg-[#0F766E]`, `text-[#0F766E]` | `rgb(15, 118, 110)` (`#0F766E`) |
| **Heading & Body Text Color (`--color-navy`)** | `"on-secondary-fixed": "#021c3a"`, `"on-surface": "#191c1e"` | `--color-navy: #142B4A`, `text-[#142B4A]` | `bodyTextColor: "rgb(20, 43, 74)"`, `h1Color: "rgb(20, 43, 74)"` (`#142B4A`) |
| **Page Background (`--color-background`)** | `"background": "#f7f9fb"` | `--color-background: #F8FAFC`, `bg-[#F8FAFC]` | `bodyBgColor: "rgb(248, 250, 252)"` (`#F8FAFC`) |
| **Card Surface (`--color-surface`)** | `"surface-container-lowest": "#ffffff"` | `--color-surface: #FFFFFF`, `bg-white` | `rgb(255, 255, 255)` (`#FFFFFF`) |
| **Section Secondary Background** | `"surface-container-low": "#f2f4f6"` | `bg-[#F1F5F9]` | `rgb(241, 245, 249)` (`#F1F5F9`) |
| **Footer Dark Surface** | `"inverse-surface": "#2d3133"` | `bg-[#1E293B]` | `rgb(30, 41, 59)` (`#1E293B`) |
| **Typography** | `Be Vietnam Pro` (`300..700`) | `next/font/google` `Be_Vietnam_Pro` (`--font-be-vietnam-pro`) | `bodyFontFamily: "\"Be Vietnam Pro\", \"Be Vietnam Pro Fallback\", \"Be Vietnam Pro\", system-ui, sans-serif"` |
| **Icon Font** | `Material Symbols Outlined` | `.material-symbols-outlined` + Google Fonts stylesheet link | `font-family: "Material Symbols Outlined"` (hiển thị vector icon sắc nét) |

### 7.2. So sánh Cấu trúc & Giao diện giữa Ảnh Stitch (`stitch-homepage-reference.jpg`) và Ảnh Thực tế (`desktop-homepage-full.png`)

| Khu vực | Thiết kế tĩnh Google Stitch (`stitch-homepage-reference.jpg`) | Giao diện thực tế (`desktop-homepage-full.png`) | Giải thích các điều chỉnh chủ đích theo Hợp đồng Backend |
|---|---|---|---|
| **1. Navbar** | Logo `Batdongsan`, 5 liên kết (`Mua bán`, `Cho thuê`, `Dự án`, `Môi giới`, `Tin tức`), icon tim/chuông, `Đăng nhập`, nút `+ Đăng tin` | Logo `Batdongsan / HỆ THỐNG THÔNG TIN`, 3 liên kết (`Trang chủ`, `Mua bán`, `Cho thuê`), `Đăng nhập`, nút `Đăng ký` | Lược bỏ các route chưa có trong phạm vi dự án (`Dự án`, `Môi giới`, `Tin tức`, icon yêu thích/thông báo giả) để đảm bảo tính toàn vẹn điều hướng. |
| **2. Hero & Search Box** | Tiêu đề `"Tìm bất động sản phù hợp với bạn"`, 3 tab (`Mua bán`, `Cho thuê`, `Dự án`), 4 ô lọc + nút `Tìm kiếm` trên nền ảnh mờ | Cùng tiêu đề & phụ đề, 3 tab (`Dự án` gắn nhãn `SẮP RA MẮT` disabled), 5 ô lọc chính (`Tỉnh/TP`, `Quận/Huyện`, `Loại BĐS`, `Khoảng giá`, `Diện tích`) + nút `Tìm kiếm` + hàng 2 gồm 4 ô nhập min/max tùy chỉnh | Tách riêng `province` và `district` và bổ sung 4 ô `minPrice`/`maxPrice`/`minArea`/`maxArea` để khớp 100% với `QueryListingsDto` của Backend. |
| **3. CategoryGrid (6 thẻ)** | `"Khám phá bất động sản"`, 6 thẻ ngang (`Căn hộ chung cư`, `Nhà riêng`, `Nhà phố`, `Đất nền`, `Biệt thự`, `Văn phòng`) kèm số đếm tĩnh (`4.820+ tin đăng`) | `"Khám phá bất động sản"`, **6 thẻ ngang** (`Căn hộ chung cư`, `Nhà ở & Nhà phố`, `Đất nền`, `Biệt thự`, `Văn phòng & Thương mại`, `Loại hình khác`) kèm phụ đề mô tả | Ánh xạ 1–1 với 6 giá trị của enum `PropertyType` (`APARTMENT`, `HOUSE`, `LAND`, `VILLA`, `COMMERCIAL`, `OTHER`) và bỏ số đếm tĩnh không có API thống kê. |
| **4. LatestListingsGrid (6 thẻ)** | `"Bất động sản nổi bật"` (3 thẻ mẫu 1 hàng, có badge `Nổi bật`, nút tim, `2 PN`, `2 PT`) | `"Bất động sản mới nhất"` (6 thẻ thật chia 2 hàng × 3 cột từ PostgreSQL, có badge giao dịch, số lượng ảnh, giá, đơn giá `/m²`, diện tích, loại hình, địa chỉ hành chính, ngày đăng) | Đổi tiêu đề thành `"Bất động sản mới nhất"` đúng với `orderBy: { createdAt: 'desc' }`; không bịa số phòng ngủ/phòng tắm hay trạng thái `Nổi bật` chưa có trong DB. |
| **5. TrustBenefits (3 thẻ)** | `"Nền tảng giao dịch bất động sản an tâm & hiệu quả"` với 3 thẻ (`Tìm kiếm thuận tiện`, `Thông tin minh bạch`, `Quản lý tin đăng chuyên nghiệp`) | Khớp 100% bố cục, tiêu đề, biểu tượng (`tune`, `verified_user`, `hub`) và nội dung 3 thẻ | Khớp trực tiếp với thiết kế Stitch. |
| **6. OwnerCtaBanner** | Banner `"Bạn muốn đăng bán hoặc cho thuê bất động sản?"` với nút `"Đăng tin ngay"` | Cùng bố cục banner chuyển sắc xanh ngọc nhạt với nút `"Đăng ký tài khoản ngay"` (`/register`) | Trỏ về route `/register` đã hoạt động ở Phase 2E-1. |
| **7. Footer** | Chân trang tối 4 cột + thanh bản quyền dưới cùng | Chân trang tối `#1E293B` 4 cột (`Batdongsan`, `Khám phá bất động sản`, `Dành cho khách hàng`, `Hỗ trợ`) + thanh bản quyền | Chỉ giữ các liên kết điều hướng hợp lệ và thông tin hỗ trợ chính thức. |

---

## 8. Bốn Lỗi Hiển thị / Mạng Thực tế Đã Phát hiện qua Chrome và Đã Sửa

1. **Lỗi #1 (Nghiêm trọng): Unlayered CSS Reset trong [`frontend/src/app/globals.css`](file:///d:/Batdongsan/frontend/src/app/globals.css) ghi đè `@layer utilities` của Tailwind CSS v4**
   - *Hiện tượng*: Trong lần mở Chrome đầu tiên, toàn bộ các lớp `mx-auto`, `p-*`, `px-*`, `py-*`, `pl-*` đều bị tính thành `0px` do quy tắc `*, *::before, *::after { margin: 0; padding: 0; }` đặt ngoài `@layer` có độ ưu tiên cao hơn `@layer utilities` của Tailwind v4.
   - *Khắc phục*: Loại bỏ reset `margin: 0; padding: 0;` nằm ngoài layer, đưa các quy tắc phần tử cơ bản (`html`, `body`, `a`, `img`, `video`) vào trong `@layer base { ... }`, và khai báo `@theme { --font-sans: var(--font-be-vietnam-pro), 'Be Vietnam Pro', system-ui, sans-serif; }`.
2. **Lỗi #2 (Nghiêm trọng): Font icon `Material Symbols Outlined` hiển thị thành chữ ligature thô (`domain`, `location_on`, ...)**
   - *Hiện tượng*: `@tailwindcss/postcss` không phát sinh request tải font từ `@import url(...)` trong `globals.css`.
   - *Khắc phục*: Thêm `<link rel="stylesheet">` tải `Material Symbols Outlined` trong `<head>` của [`frontend/src/app/layout.tsx`](file:///d:/Batdongsan/frontend/src/app/layout.tsx#L29-L35) và định nghĩa rõ `.material-symbols-outlined` trong [`frontend/src/app/globals.css`](file:///d:/Batdongsan/frontend/src/app/globals.css#L48-L66).
3. **Lỗi #3 (Trung bình–Cao): Timeout `504` trên `/_next/image` khi tải đồng thời 6 ảnh Unsplash & cảnh báo LCP trên Console (`task-4293.log` dòng 16–24)**
   - *Hiện tượng*: Nhật ký `task-4293.log` ghi nhận `upstream image response timed out` cho 5 ảnh Unsplash trong lần tải đầu tiên và cảnh báo LCP thiếu `loading="eager"`.
   - *Khắc phục*: Cập nhật [`ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx#L17-L67) nhận prop `priority?: boolean` (`loading={priority ? 'eager' : 'lazy'}`) và `unoptimized` (do URL Unsplash đã có sẵn `?auto=format&fit=crop&w=1000&q=80` trả về `image/avif`), đồng thời cập nhật [`LatestListingsGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx#L121-L127) truyền `priority={index < 3}`.
4. **Lỗi #4 (Nhỏ): Ô nhập liệu trong [`HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx#L156-L362) bị hẹp trên màn hình Desktop `1440×900`**
   - *Khắc phục*: Mở rộng khung tìm kiếm từ `max-w-5xl` lên `max-w-6xl` và tinh chỉnh padding nội bộ (`left-2.5 text-base`, `pl-8 pr-6 text-xs`), giúp hiển thị đầy đủ placeholder trên Desktop.

---

## 9. Kết quả Chạy Lại Test / Lint / Build & Trạng thái Git Cuối cùng

- **`npm test -- --run` (Vitest)**: **`10/10` test files passed, `69/69` tests passed** (đã bổ sung test kiểm tra `priority` / `loading="eager"` trong [`frontend/src/__tests__/ListingCard.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/ListingCard.test.tsx#L120-L134)).
- **`npm run lint` (ESLint 9)**: **`0 errors, 0 warnings`**.
- **`npm run build` (Next.js 16.4.2 Production Build)**: **Thành công (`◐ /`, `○ /login`, `○ /register`, `ƒ /api/auth/*`)**.
- **Danh sách 6 tệp Frontend thay đổi so với `HEAD` (`aa514d0`)**:
  1. [`frontend/src/app/globals.css`](file:///d:/Batdongsan/frontend/src/app/globals.css)
  2. [`frontend/src/app/layout.tsx`](file:///d:/Batdongsan/frontend/src/app/layout.tsx)
  3. [`frontend/src/components/home/HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx)
  4. [`frontend/src/components/home/LatestListingsGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx)
  5. [`frontend/src/components/home/ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx)
  6. [`frontend/src/__tests__/ListingCard.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/ListingCard.test.tsx)
- **Kết luận Đánh giá Cuối cùng**: **READY FOR ACCEPTANCE**.
