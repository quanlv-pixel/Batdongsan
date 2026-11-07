# BÁO CÁO TIẾN ĐỘ TRIỂN KHAI PHASE 2E-2A — PUBLIC HOMEPAGE (`/` — TRANG CHỦ CÔNG KHAI)
*(Đã hiệu đính và đối chiếu xác thực toàn diện theo mã nguồn thực tế — Targeted Acceptance Verification & Reconciliation)*

- **Dự án:** Hệ thống Bất động sản (`D:\Batdongsan`)
- **Giai đoạn:** Phase 2E-2A — Public Homepage Implementation
- **Stitch Project ID:** `13967597418813716400`
- **Stitch Homepage Screen ID:** `b9d3227abd6248c59bcf0080b813e73f` (*Trang chủ Batdongsan - Desktop*)
- **Nhánh cơ sở (Base Branch):** `feat/phase2e1-frontend-auth`
- **Commit xuất phát thực tế (`git log -1 --oneline`):** `3e02cd6 feat(phase2e1): implement auth foundation and BFF hardening`
- **Nhánh tính năng hiện tại (Feature Branch):** `feat/phase2e2-public-listings`
- **Ngày thực hiện & Hiệu đính:** 03/11/2026

---

## 1. Executive Summary (Tóm tắt điều hành)

Giai đoạn **Phase 2E-2A** đã hoàn thành việc triển khai trang chủ công khai (`/` — [`page.tsx`](file:///d:/Batdongsan/frontend/src/app/page.tsx)) cùng hệ thống component tái sử dụng, bộ định dạng dữ liệu chuẩn tiền tệ Việt Nam (`BigInt`), lớp kết nối API công khai và bộ kiểm thử đơn vị/tích hợp cho Frontend.

> **Lưu ý hiệu đính báo cáo:** Trong phiên bản báo cáo đầu tiên viết ngay sau khi rút gọn ngữ cảnh (context compaction), một số tên phương thức/DTO/token được ghi trong văn bản báo cáo bị sai lệch so với mã nguồn thật trên đĩa (ví dụ ghi nhầm `findAllPublic`, `PublicListingsQueryDto`, `#0066CC`, `Next.js 16.2.1`). Tuy nhiên, **toàn bộ mã nguồn Frontend đã triển khai trên đĩa** ngay từ đầu đã được viết khớp chính xác với hợp đồng Backend thật (`ListingsController.getPublicListings`, `ListingsService.getPublicListings`, `QueryListingsDto`, `images: { id, url, order }`, `areaSqm: number`, `RentalPeriod: 'MONTH' | 'QUARTER' | 'YEAR'`, bảng màu Deep Teal `#0F766E` / Deep Navy `#142B4A`, và `Next.js 16.4.2`). Bản báo cáo này đã được hiệu đính toàn bộ để phản ánh chính xác 100% mã nguồn thực tế.

Các kết quả cốt lõi đạt được:
1. **Bám sát thiết kế Google Stitch (`b9d3227abd6248c59bcf0080b813e73f`) và Hệ thống Design Tokens của dự án:** Tái hiện đầy đủ cấu trúc 7 phần gồm `Navbar`, `HeroSearchBox`, `CategoryGrid (6 loại hình BĐS)`, `LatestListingsGrid (Bất động sản mới nhất)`, `TrustBenefits`, `OwnerCtaBanner` và `Footer` 4 cột sử dụng bảng màu chuẩn của dự án (`--color-primary: #0F766E` khớp chính xác `primary-container: #0f766e` trong Stitch HTML, `--color-navy: #142B4A`, nền `#F8FAFC`) và font `Be Vietnam Pro`.
2. **Trung thực tuyệt đối với hợp đồng dữ liệu Backend (`GET /api/listings`):**
   - Khớp chính xác phương thức [`ListingsService.getPublicListings`](file:///d:/Batdongsan/backend/src/listings/listings.service.ts#L258-L343) và [`QueryListingsDto`](file:///d:/Batdongsan/backend/src/listings/dto/query-listings.dto.ts#L17-L74).
   - Loại bỏ hoàn toàn các thông tin giả lập có trong mẫu tĩnh Stitch nhưng không tồn tại trong Prisma schema (như số phòng ngủ `2 PN`, số phòng tắm `2 PT`, nhãn `Nổi bật`, nút yêu thích/thông báo giả, hay số lượng tin đăng tĩnh `4.820+ tin đăng` theo danh mục).
   - Tiêu đề khu vực danh sách tin đăng được đặt trung thực là **"Bất động sản mới nhất"** (khớp chính xác với cơ chế sắp xếp `orderBy: { createdAt: 'desc' }` của Backend).
3. **Định dạng giá VNĐ chuẩn xác bằng `BigInt` thuần:** Xử lý chuỗi `priceVnd` trực tiếp qua `BigInt` trong [`formatters.ts`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts), không ép kiểu qua `Number` gây mất độ chính xác với số lớn, kết hợp hậu tố chu kỳ thuê (`MONTH` -> `/tháng`, `QUARTER` -> `/quý`, `YEAR` -> `/năm`) khi `transactionType === 'FOR_RENT'`.
4. **Tương thích kiến trúc Next.js 16.4.2 Partial Prerendering (`cacheComponents: true`):** Tách phần khung tĩnh ([`HomePageShell`](file:///d:/Batdongsan/frontend/src/app/page.tsx#L37-L57)) và luồng dữ liệu động ([`LatestListingsSection`](file:///d:/Batdongsan/frontend/src/app/page.tsx#L16-L31) bọc trong `<Suspense>`) giúp trang chủ vừa phản hồi tức thì phần khung giao diện, vừa luôn lấy dữ liệu tin đăng đã duyệt mới nhất (`cache: 'no-store'`).
5. **Chất lượng kiểm thử & biên dịch:**
   - **Unit/Component Tests (`npm test`):** **68/68 bài kiểm thử PASS** trên 10 tệp test (44 bài kiểm thử baseline + 24 bài kiểm thử mới).
   - **ESLint (`npm run lint`):** **PASS** (0 lỗi, 0 cảnh báo).
   - **Next.js 16.4.2 Production Build (`npm run build`):** **PASS** (TypeScript 0 lỗi, xác nhận Partial Prerender `◐ /`).

---

## 2. Git Baseline and Branch Verification (Xác minh trạng thái Git và Nhánh làm việc)

Kết quả kiểm tra trực tiếp từ Git tại `D:\Batdongsan`:

- **Nhánh hiện tại (`git branch --show-current`):** `feat/phase2e2-public-listings`
- **Commit HEAD hiện tại (`git log -1 --oneline`):**
  ```text
  3e02cd6 feat(phase2e1): implement auth foundation and BFF hardening
  ```
- **Kiểm tra khoảng trắng thừa (`git diff --check`):** Sạch (`0` lỗi khoảng trắng/EOF).
- **Trạng thái cây thư mục làm việc (`git status -sb`):**
  - Cây thư mục làm việc **không phải** là trạng thái trống hoàn toàn mà đang chứa:
    1. Các tệp đã sửa đổi và tạo mới chưa stage thuộc phạm vi **Phase 2E-2A**.
    2. **Ba tệp nội bộ không theo dõi (untracked) được bảo toàn nguyên trạng theo đúng chỉ thị:**
       - `backend/check-db-fingerprint.mjs`
       - `phase2d2-review.patch`
       - `text.txt`
  - Chưa thực hiện bất kỳ lệnh `git add`, `git commit`, hay `git push` nào. Backend, Prisma schema và migrations hoàn toàn không bị thay đổi.

---

## 3. Baseline Frontend Test / Lint / Build Verification Before Coding (Xác minh Baseline trước khi lập trình)

Trước khi viết mã mới của Phase 2E-2A, bộ kiểm thử, linter và trình biên dịch của `frontend` (sử dụng **Next.js `16.4.2`** theo [`frontend/package.json`](file:///d:/Batdongsan/frontend/package.json#L13), [`frontend/package-lock.json`](file:///d:/Batdongsan/frontend/package-lock.json#L11) và `npm ls next`) đã được xác minh:

| Lệnh kiểm tra | Kết quả Baseline (Trước Phase 2E-2A) | Chi tiết phân tích |
| :--- | :--- | :--- |
| `npm test` | **PASS (44/44 tests, 6 test files)** | Sau khi hoàn tất **Phase 2E-1.1 (`3e02cd6`)**, bộ test thực tế trên nhánh cơ sở gồm **6 tệp kiểm thử với 44 tests**:<br>- `api-client.test.ts`: 9 tests<br>- `AuthContext.test.tsx`: 4 tests<br>- `bff-auth-routes.test.ts`: 13 tests<br>- `Navbar.test.tsx`: 6 tests<br>- `LoginPage.test.tsx`: 6 tests<br>- `RegisterPage.test.tsx`: 6 tests |
| `npm run lint` | **PASS (0 errors, 0 warnings)** | ESLint 9 (`eslint-config-next@16.4.2`) sạch hoàn toàn. |
| `npm run build` | **PASS** | Next.js `16.4.2` (Turbopack, `cacheComponents: true`, `partialPrefetching: true`) biên dịch thành công. |

---

## 4. Stitch Homepage Design Mapping & Token Reconciliation (Ánh xạ thiết kế Google Stitch & Đối chiếu Design Tokens)

### 4.1. Đối chiếu trực tiếp HTML/CSS của Stitch (`b9d3227abd6248c59bcf0080b813e73f`) với Frontend thực tế

Mã nguồn HTML/CSS gốc của màn hình Stitch `projects/13967597418813716400/screens/b9d3227abd6248c59bcf0080b813e73f` (file `projects/13967597418813716400/files/15831861370849241039`) sử dụng hệ màu Material 3 Teal/Slate (tuyệt đối **không có** màu `#0066CC`). Bảng đối chiếu chi tiết giữa Stitch HTML gốc và mã nguồn Frontend tại [`globals.css`](file:///d:/Batdongsan/frontend/src/app/globals.css#L5-L15), [`layout.tsx`](file:///d:/Batdongsan/frontend/src/app/layout.tsx#L6-L31) và các component `src/components/home/*`:

| Thuộc tính / Design Token | Giá trị chính xác trong Stitch HTML (`b9d3227abd6248c59bcf0080b813e73f`) | Giá trị chính xác trong Frontend đã triển khai | Đánh giá độ khớp |
| :--- | :--- | :--- | :--- |
| **Màu nhấn chính cho nút bấm, tab đang chọn, giá tiền, logo box (`primary-container` / `--color-primary`)** | `"primary-container": "#0f766e"` (Deep Teal) | `--color-primary: #0F766E` / `bg-[#0F766E]`, `text-[#0F766E]` | **Khớp chính xác 100% (`#0F766E`)** |
| **Màu nhấn đậm khi hover / chữ nhấn (`primary` / `--color-primary-600`, `--color-primary-700`)** | `"primary": "#005c55"`, `"on-primary-fixed-variant": "#00504a"` | `--color-primary-600: #0D6660`, `--color-primary-700: #0A524D`, `hover:bg-[#0D655E]` | **Tương đương hài hòa** (cùng dải màu Dark Teal) |
| **Màu tiêu đề chính & văn bản đậm (`on-secondary-fixed` / `--color-navy`)** | `"on-secondary-fixed": "#021c3a"`, `"on-surface": "#191c1e"` | `--color-navy: #142B4A` / `text-[#142B4A]` | **Nhất quán theo Design System đã thống nhất từ Phase 2E-1 (`#142B4A` Deep Navy)** |
| **Màu nền trang (`background` / `--color-background`)** | `"background": "#f7f9fb"`, `"surface": "#f7f9fb"` | `--color-background: #F8FAFC` / `bg-[#F8FAFC]` (Slate-50) | **Nhất quán theo Design System Phase 2E-1 (`#F8FAFC` so với `#F7F9FB`)** |
| **Màu nền bề mặt thẻ (`surface-container-lowest` / `--color-surface`)** | `"surface-container-lowest": "#ffffff"` | `--color-surface: #FFFFFF` / `bg-white` | **Khớp chính xác 100% (`#FFFFFF`)** |
| **Màu nền vùng phụ (`surface-container-low` / Section background)** | `"surface-container-low": "#f2f4f6"` | `bg-[#F1F5F9]` (Slate-100) | **Tương đương sát (`#F1F5F9` so với `#F2F4F6`)** |
| **Màu nền Footer tối (`inverse-surface`)** | `"inverse-surface": "#2d3133"` | `bg-[#1E293B]` (Slate-800) | **Điều chỉnh chủ đích theo bảng màu Slate/Navy của dự án** |
| **Font chữ (`fontFamily`)** | `"Be Vietnam Pro"` (`weights: 300, 400, 500, 600, 700`) + `Material Symbols Outlined` | `Be_Vietnam_Pro` (`weights: 300, 400, 500, 600, 700`) + `Material Symbols Outlined` | **Khớp chính xác 100%** |
| **Độ bo góc (`borderRadius`)** | `"DEFAULT": "0.25rem"`, `"lg": "0.5rem" (8px)`, `"xl": "0.75rem" (12px)` | `--radius: 8px`, `rounded-lg` (`8px`), `rounded-xl` (`12px`) | **Khớp chính xác 100%** |

---

## 5. Backend Contract and Field Truthfulness Matrix (Ma trận đối chiếu Hợp đồng Backend & Tính trung thực dữ liệu)

Đối chiếu trực tiếp từ mã nguồn Backend hiện tại (nhánh `feat/phase2e2-public-listings`, không sửa đổi Backend):
- **Controller:** [`ListingsController.getPublicListings`](file:///d:/Batdongsan/backend/src/listings/listings.controller.ts#L62-L65) (`@Get()` tại `@Controller('listings')` -> `GET /api/listings`).
- **Query DTO:** [`QueryListingsDto`](file:///d:/Batdongsan/backend/src/listings/dto/query-listings.dto.ts#L17-L74) gồm 11 trường: `page`, `limit`, `province`, `district`, `ward`, `propertyType`, `transactionType`, `minPrice`, `maxPrice`, `minArea`, `maxArea`.
- **Service:** [`ListingsService.getPublicListings`](file:///d:/Batdongsan/backend/src/listings/listings.service.ts#L258-L343) lọc cứng `status: ListingStatus.APPROVED` (dòng 264), sắp xếp `orderBy: { createdAt: 'desc' }` (dòng 309), dùng `select` allowlist (dòng 311–330) và chuyển `priceVnd` sang `string` qua [`formatListing`](file:///d:/Batdongsan/backend/src/listings/listings.service.ts#L28-L33).
- **Prisma Schema:** [`Listing`](file:///d:/Batdongsan/database/prisma/schema.prisma#L113-L150) và [`ListingImage`](file:///d:/Batdongsan/database/prisma/schema.prisma#L152-L161).

| Hạng mục / Trường dữ liệu | Hợp đồng Backend & Prisma thực tế | Khai báo & Xử lý tại Frontend ([`types/index.ts`](file:///d:/Batdongsan/frontend/src/types/index.ts), [`public-listings.ts`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts), [`ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx)) | Trạng thái khớp |
| :--- | :--- | :--- | :--- |
| **Định danh `id`** | `String @id @default(cuid())` (CUID string; dữ liệu seed dùng chuỗi định danh như `seed_listing_01`) | `id: string` -> dùng làm `key` và liên kết `/bat-dong-san/${listing.id}` | **Khớp 100%** |
| **`title` & `description`** | `string` | `title: string`, `description: string` | **Khớp 100%** |
| **`transactionType`** | Enum `TransactionType`: `'FOR_SALE' \| 'FOR_RENT'` | `TransactionType = 'FOR_SALE' \| 'FOR_RENT'` | **Khớp 100%** |
| **`propertyType`** | Enum `PropertyType`: `'APARTMENT' \| 'HOUSE' \| 'LAND' \| 'VILLA' \| 'COMMERCIAL' \| 'OTHER'` | `PropertyType` khớp chính xác 6 giá trị | **Khớp 100%** |
| **`priceVnd`** | `BigInt` trong DB -> `formatListing()` chuyển thành `string` khi trả JSON | `priceVnd: string` -> định dạng bằng `BigInt` thuần qua [`formatVndPrice`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts#L121-L173) | **Khớp 100%** |
| **`rentalPeriod`** | Enum `RentalPeriod`: `'MONTH' \| 'QUARTER' \| 'YEAR'` hoặc `null` | `RentalPeriod = 'MONTH' \| 'QUARTER' \| 'YEAR'` (`null` khi `FOR_SALE`), hiển thị `/tháng`, `/quý`, `/năm` | **Khớp 100%** |
| **`areaSqm`** | `Float` trong Prisma -> serialize JSON thành `number` | `areaSqm: number` -> định dạng qua [`formatArea`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts#L179-L191) (`m²`) và tính đơn giá `/m²` qua [`formatPricePerSqm`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts#L197-L263) | **Khớp 100%** |
| **`province`, `district`, `ward`** | `province: string`, `district: string`, `ward: string \| null` | `province: string`, `district: string`, `ward: string \| null` -> ghép qua [`formatAdministrativeLocation`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts#L292-L302) | **Khớp 100%** |
| **`status`** | `ListingStatus` (Backend chỉ trả `'APPROVED'`) | `status: ListingStatus` + lọc bảo vệ kép `item.status === 'APPROVED'` tại [`public-listings.ts`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts#L108) | **Khớp 100%** |
| **`createdAt`, `updatedAt`** | `DateTime` -> chuỗi ISO 8601 trong JSON | `createdAt: string`, `updatedAt: string` -> định dạng `dd/MM/yyyy` qua [`formatListingDate`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts#L269-L287) | **Khớp 100%** |
| **`images`** | `Array<{ id: string, url: string, order: number }>` đã sắp xếp `order: 'asc'` | `ListingImage { id: string; url: string; order: number }` -> sắp xếp tăng dần theo `order` và lấy `sortedImages[0]?.url` | **Khớp 100%** |
| **Các trường nhạy cảm (`streetAddress`, `latitude`, `longitude`, `ownerId`, `owner`)** | Bị loại trừ khỏi `select` trong `ListingsService.getPublicListings` | Bị loại trừ hoàn toàn khỏi `PublicListingSummary` và bị lọc bỏ bởi allowlist tường minh trong [`sanitizePublicListing`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts#L16-L53) | **An toàn 100%** |
| **Các chi tiết giả lập trên Stitch (`2 PN`, `2 PT`, badge `Nổi bật`, `4.820+ tin đăng`)** | Không tồn tại trong Prisma schema hoặc API | Đã loại bỏ hoàn toàn khỏi `ListingCard` và `CategoryGrid` | **Không bịa dữ liệu** |

---

## 6. Location Selector & CategoryGrid Mapping Verification (Xác minh Bộ chọn Địa điểm & Ánh xạ Danh mục)

### 6.1. Bộ chọn địa giới hành chính (`province`, `district`)
- Hệ thống Backend hiện tại không có endpoint danh mục Tỉnh/Thành hay Quận/Huyện mà lọc bằng chuỗi con không phân biệt hoa thường (`contains`, `mode: 'insensitive'`) trong [`ListingsService.getPublicListings`](file:///d:/Batdongsan/backend/src/listings/listings.service.ts#L267-L275).
- Do đó, [`HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx#L218-L265) triển khai 2 ô `<input type="text">` riêng biệt cho `Tỉnh / Thành phố` (`province`) và `Quận / Huyện` (`district`), đảm bảo gửi đúng tham số lên URL `/bat-dong-san` mà không dùng danh sách giả lập khóa cứng.

### 6.2. Bảng đối chiếu ánh xạ [`CategoryGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx#L12-L49) với `PropertyType` Enum

Trong bản thiết kế tĩnh của Stitch, 6 ô danh mục gồm: *Căn hộ chung cư, Nhà riêng, Nhà phố, Đất nền, Biệt thự, Văn phòng*. Tuy nhiên, enum [`PropertyType`](file:///d:/Batdongsan/database/prisma/schema.prisma#L45-L52) trong Prisma chỉ có 1 giá trị `HOUSE` cho nhà ở và có thêm giá trị thứ 6 là `OTHER`. Để không gán trùng 2 thẻ khác nhau vào cùng `propertyType=HOUSE` và không tự chế thêm enum mới, [`CategoryGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx) ánh xạ 1-1 như sau:

| STT | Nhãn hiển thị trên thẻ (`label`) | Phụ đề giải thích (`subtitle`) | Giá trị Enum (`PropertyType`) | Đường dẫn tạo ra (`href`) | Đánh giá độ chính xác ngữ nghĩa |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Căn hộ chung cư** | Chung cư & căn hộ dịch vụ | `APARTMENT` | `/bat-dong-san?propertyType=APARTMENT` | **Chính xác 100%** |
| 2 | **Nhà ở & Nhà phố** | Nhà riêng lẻ & nhà mặt phố | `HOUSE` | `/bat-dong-san?propertyType=HOUSE` | **Chính xác & Trung thực:** Gộp *"Nhà riêng"* và *"Nhà phố"* của Stitch vào 1 thẻ duy nhất ứng với `HOUSE`, tránh việc 2 thẻ khác nhau cùng trỏ về một enum `HOUSE`. |
| 3 | **Đất nền** | Đất thổ cư & đất phân lô | `LAND` | `/bat-dong-san?propertyType=LAND` | **Chính xác 100%** |
| 4 | **Biệt thự** | Biệt thự đơn lập & song lập | `VILLA` | `/bat-dong-san?propertyType=VILLA` | **Chính xác 100%** |
| 5 | **Văn phòng & Thương mại** | Mặt bằng & tòa nhà văn phòng | `COMMERCIAL` | `/bat-dong-san?propertyType=COMMERCIAL` | **Chính xác 100%** (Mở rộng nhãn *"Văn phòng"* của Stitch để bao quát đúng ngữ nghĩa `COMMERCIAL`). |
| 6 | **Loại hình khác** | Kho xưởng & bất động sản khác | `OTHER` | `/bat-dong-san?propertyType=OTHER` | **Chính xác & Minh bạch:** Trình bày đúng bản chất danh mục tổng hợp `OTHER` thay vì gắn nhãn giả một loại hình cụ thể không có enum riêng. |

---

## 7. Route Integrity & Interim Destination Status (Tính toàn vẹn Điều hướng & Trạng thái các Route đích)

### 7.1. Trạng thái tồn tại thực tế của các Route trong `frontend/src/app`
- `/` ([`src/app/page.tsx`](file:///d:/Batdongsan/frontend/src/app/page.tsx)): **Đã tồn tại và hoạt động hoàn chỉnh (Phase 2E-2A).**
- `/login` ([`src/app/login/page.tsx`](file:///d:/Batdongsan/frontend/src/app/login/page.tsx)): **Đã tồn tại và hoạt động hoàn chỉnh (Phase 2E-1).**
- `/register` ([`src/app/register/page.tsx`](file:///d:/Batdongsan/frontend/src/app/register/page.tsx)): **Đã tồn tại và hoạt động hoàn chỉnh (Phase 2E-1).**
- `/bat-dong-san`: **Chưa có tệp `src/app/bat-dong-san/page.tsx`** (thuộc phạm vi **Phase 2E-2B**, bị cấm tạo trong Phase 2E-2A theo yêu cầu đề bài *"Do not implement the search results page or property detail page in this task"*).
- `/bat-dong-san/[id]`: **Chưa có tệp `src/app/bat-dong-san/[id]/page.tsx`** (thuộc phạm vi **Phase 2E-2C**, bị cấm tạo trong Phase 2E-2A).

### 7.2. Bảng kiểm kê toàn bộ liên kết trên Trang chủ

| Component | Nhãn hiển thị | Đường dẫn đích (`href` / `router.push`) | Route đích đã tồn tại trong Phase 2E-2A? | Hành vi khi nhấp chuột ở thời điểm kết thúc Phase 2E-2A |
| :--- | :--- | :--- | :---: | :--- |
| [`Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) | Logo `Batdongsan` / `Trang chủ` | `/` | **Có** | Điều hướng về Trang chủ (`200 OK`) |
| [`Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) | `Mua bán` | `/bat-dong-san?transactionType=FOR_SALE` | **Chưa (Phase 2E-2B)** | Trả về trang 404 mặc định của Next.js cho tới khi triển khai Phase 2E-2B |
| [`Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) | `Cho thuê` | `/bat-dong-san?transactionType=FOR_RENT` | **Chưa (Phase 2E-2B)** | Trả về trang 404 mặc định của Next.js cho tới khi triển khai Phase 2E-2B |
| [`Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx) | `Đăng nhập` / `Đăng ký` | `/login` / `/register` | **Có** | Điều hướng tới trang Đăng nhập / Đăng ký (`200 OK`) |
| [`HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx) | Nút `Tìm kiếm` (submit form) | `/bat-dong-san?...` | **Chưa (Phase 2E-2B)** | Điều hướng tới URL kết quả tìm kiếm kèm query params hợp lệ; hiện trả về 404 cho tới khi có Phase 2E-2B |
| [`CategoryGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx) | `Xem tất cả bất động sản` & 6 thẻ danh mục | `/bat-dong-san` & `/bat-dong-san?propertyType=...` | **Chưa (Phase 2E-2B)** | Hiện trả về 404 cho tới khi có Phase 2E-2B |
| [`LatestListingsGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx) | `Xem tất cả tin đăng` | `/bat-dong-san` | **Chưa (Phase 2E-2B)** | Hiện trả về 404 cho tới khi có Phase 2E-2B |
| [`ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx) | Tiêu đề tin đăng (`listing.title`) | `/bat-dong-san/${listing.id}` | **Chưa (Phase 2E-2C)** | Hiện trả về 404 cho tới khi có Phase 2E-2C |
| [`OwnerCtaBanner.tsx`](file:///d:/Batdongsan/frontend/src/components/home/OwnerCtaBanner.tsx) | `Đăng ký tài khoản ngay` | `/register` | **Có** | Điều hướng tới trang Đăng ký (`200 OK`) |
| [`Footer.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx) | `Batdongsan`, `Trang chủ hệ thống`, `Truy cập tài khoản`, `Mở tài khoản thành viên` | `/`, `/login`, `/register` | **Có** | Điều hướng thành công (`200 OK`) |
| [`Footer.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx) | 4 liên kết cột *Khám phá bất động sản* | `/bat-dong-san?...` | **Chưa (Phase 2E-2B)** | Hiện trả về 404 cho tới khi có Phase 2E-2B |
| [`Footer.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx) | `hotro@batdongsan.local` | `mailto:hotro@batdongsan.local` | **Có (`mailto:`)** | Mở trình gửi email mặc định |

---

## 8. Image Domain, API Privacy and Server-Side Data Fetching (Chiến lược Ảnh, Bảo mật Riêng tư & Luồng gọi API)

1. **Cấu hình tên miền ảnh (`images.unsplash.com`):**
   - Dữ liệu seed trong [`database/prisma/seed.ts`](file:///d:/Batdongsan/database/prisma/seed.ts) sử dụng ảnh từ `https://images.unsplash.com/...`.
   - [`frontend/next.config.ts`](file:///d:/Batdongsan/frontend/next.config.ts#L8-L15) đã khai báo `images.remotePatterns` cho `https://images.unsplash.com`.
   - [`ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx#L36-L88) sắp xếp mảng `images` theo `order` tăng dần, dùng `unoptimized` nếu gặp URL ngoài `images.unsplash.com`, và tự động chuyển sang giao diện dự phòng (`data-testid="listing-image-fallback"`) khi mảng ảnh rỗng hoặc gặp sự kiện `onError`.
2. **Luồng gọi API Server-Side & Bảo vệ dữ liệu riêng tư ([`public-listings.ts`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts)):**
   - Dữ liệu tin đăng công khai trên trang chủ được lấy **trực tiếp ở tầng Server Component** ([`LatestListingsSection`](file:///d:/Batdongsan/frontend/src/app/page.tsx#L16-L31)) thông qua hàm [`fetchPublicListings`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts#L60-L128) (không đi vòng qua BFF vì `GET /api/listings` là endpoint công khai không cần đọc/ghi cookie `HttpOnly`).
   - Tái sử dụng hàm [`getBackendBaseUrl()`](file:///d:/Batdongsan/frontend/src/lib/server-config.ts#L5-L11) (`INTERNAL_API_BASE_URL || NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'`) với tùy chọn `cache: 'no-store'`.
   - Hàm [`sanitizePublicListing`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts#L16-L53) khởi tạo một object mới với **allowlist tường minh gồm đúng 15 khóa công khai** (`id`, `title`, `description`, `propertyType`, `transactionType`, `priceVnd`, `rentalPeriod`, `areaSqm`, `province`, `district`, `ward`, `status`, `createdAt`, `updatedAt`, `images`), kết hợp bộ lọc `item.status === 'APPROVED'` tại dòng 108. Nhờ đó, các trường nhạy cảm (`streetAddress`, `latitude`, `longitude`, `ownerId`, thông tin liên hệ chủ nhà) **không bao giờ** có thể bị serialize xuống Client Component.

---

## 9. Exact File Accounting Inventory (Kiểm kê chính xác số lượng tệp theo Git)

Đối chiếu trực tiếp từ `git status --porcelain=v1`, `git diff --stat HEAD` và `git ls-files --others --exclude-standard`:

1. **Tệp mã nguồn triển khai mới (Untracked implementation files — 8 tệp):**
   - [`frontend/src/lib/formatters.ts`](file:///d:/Batdongsan/frontend/src/lib/formatters.ts)
   - [`frontend/src/lib/public-listings.ts`](file:///d:/Batdongsan/frontend/src/lib/public-listings.ts)
   - [`frontend/src/components/home/HeroSearchBox.tsx`](file:///d:/Batdongsan/frontend/src/components/home/HeroSearchBox.tsx)
   - [`frontend/src/components/home/CategoryGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/CategoryGrid.tsx)
   - [`frontend/src/components/home/ListingCard.tsx`](file:///d:/Batdongsan/frontend/src/components/home/ListingCard.tsx)
   - [`frontend/src/components/home/LatestListingsGrid.tsx`](file:///d:/Batdongsan/frontend/src/components/home/LatestListingsGrid.tsx)
   - [`frontend/src/components/home/TrustBenefits.tsx`](file:///d:/Batdongsan/frontend/src/components/home/TrustBenefits.tsx)
   - [`frontend/src/components/home/OwnerCtaBanner.tsx`](file:///d:/Batdongsan/frontend/src/components/home/OwnerCtaBanner.tsx)
2. **Tệp mã nguồn/cấu hình đã theo dõi được cập nhật (Modified tracked implementation files — 5 tệp):**
   - [`frontend/next.config.ts`](file:///d:/Batdongsan/frontend/next.config.ts)
   - [`frontend/src/types/index.ts`](file:///d:/Batdongsan/frontend/src/types/index.ts)
   - [`frontend/src/components/common/Navbar.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Navbar.tsx)
   - [`frontend/src/components/common/Footer.tsx`](file:///d:/Batdongsan/frontend/src/components/common/Footer.tsx)
   - [`frontend/src/app/page.tsx`](file:///d:/Batdongsan/frontend/src/app/page.tsx)
3. **Tệp kiểm thử tạo mới (Untracked new test files — 4 tệp):**
   - [`frontend/src/__tests__/formatters.test.ts`](file:///d:/Batdongsan/frontend/src/__tests__/formatters.test.ts) (9 tests)
   - [`frontend/src/__tests__/HeroSearchBox.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/HeroSearchBox.test.tsx) (5 tests)
   - [`frontend/src/__tests__/ListingCard.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/ListingCard.test.tsx) (4 tests)
   - [`frontend/src/__tests__/HomePage.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/HomePage.test.tsx) (4 tests)
4. **Tệp kiểm thử đã theo dõi được cập nhật (Modified tracked test file — 1 tệp):**
   - [`frontend/src/__tests__/Navbar.test.tsx`](file:///d:/Batdongsan/frontend/src/__tests__/Navbar.test.tsx) (tăng từ 6 lên 8 tests)
5. **Tệp báo cáo tiến độ tạo mới (Untracked report file — 1 tệp):**
   - [`docs/reports/PHASE2E2A_PUBLIC_HOMEPAGE_PROGRESS_2026-11-03.md`](file:///d:/Batdongsan/docs/reports/PHASE2E2A_PUBLIC_HOMEPAGE_PROGRESS_2026-11-03.md)
6. **Các tệp nội bộ không theo dõi được bảo toàn nguyên trạng (Preserved untracked files — 3 tệp):**
   - `backend/check-db-fingerprint.mjs`
   - `phase2d2-review.patch`
   - `text.txt`

*(Tổng cộng theo Git: **6 tệp tracked được sửa đổi** = 5 tệp code + 1 tệp test; **13 tệp untracked mới của Phase 2E-2A** = 8 tệp code + 4 tệp test + 1 tệp báo cáo; cùng **3 tệp untracked nội bộ được giữ nguyên**).*

---

## 10. Verification Results (`npm test`, `npm run lint`, `npm run build`)

1. **`npm test` (Vitest v4.1.12):**
   - **Test Files:** `10 passed (10)`
   - **Tests:** `68 passed (68)` (`formatters.test.ts`: 9, `Navbar.test.tsx`: 8, `ListingCard.test.tsx`: 4, `HeroSearchBox.test.tsx`: 5, `HomePage.test.tsx`: 4, `LoginPage.test.tsx`: 6, `RegisterPage.test.tsx`: 6, `api-client.test.ts`: 9, `AuthContext.test.tsx`: 4, `bff-auth-routes.test.ts`: 13).
2. **`npm run lint` (ESLint 9):**
   - **Kết quả:** `0 errors, 0 warnings`.
3. **`npm run build` (Next.js 16.4.2 Turbopack):**
   - **TypeScript:** `0 errors`.
   - **Routes:** `◐ /` (Partial Prerender), `○ /login`, `○ /register`, `ƒ /api/auth/login`, `ƒ /api/auth/logout`, `ƒ /api/auth/me`, `ƒ /api/auth/register`.

---

## 11. Remaining Items for Phase 2E-2B and Phase 2E-2C (Các hạng mục tiếp theo)

1. **Phase 2E-2B — Trang Tìm kiếm & Danh sách Bất động sản (`/bat-dong-san`):**
   - Triển khai route `frontend/src/app/bat-dong-san/page.tsx` để tiếp nhận toàn bộ các liên kết và bộ lọc từ `Navbar`, `HeroSearchBox`, `CategoryGrid`, `LatestListingsGrid` và `Footer` (hiện các đường dẫn `/bat-dong-san*` sẽ trả về 404 cho tới khi lát cắt 2E-2B được triển khai).
2. **Phase 2E-2C — Trang Chi tiết Bất động sản & Gửi yêu cầu liên hệ (`/bat-dong-san/[id]`):**
   - Triển khai route `frontend/src/app/bat-dong-san/[id]/page.tsx` tích hợp `GET /api/listings/:id` và `POST /api/contact-requests`.

---

## 12. Final Readiness Verdict for Phase 2E-2A Review (Kết luận Mức độ Sẵn sàng)

**TRẠNG THÁI: SẴN SÀNG ĐỂ NGƯỜI DÙNG NGHIỆM THU (READY FOR ACCEPTANCE)**

- Mã nguồn triển khai của Phase 2E-2A khớp 100% với hợp đồng Backend thực tế (`ListingsController.getPublicListings`, `QueryListingsDto`, `ListingsService.getPublicListings`), hệ thống Design Tokens (`#0F766E` / `#142B4A` / `#F8FAFC` / `Be Vietnam Pro`) và màn hình Stitch `b9d3227abd6248c59bcf0080b813e73f`.
- Mọi điểm không nhất quán trong văn bản báo cáo trước đó đã được đối chiếu và hiệu đính đầy đủ.
