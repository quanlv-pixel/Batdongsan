# HƯỚNG DẪN KỸ THUẬT DÀNH CHO LẬP TRÌNH VIÊN: MODULE TÌM KIẾM BẤT ĐỘNG SẢN (PHASE 2E-2B)
## Kiến Trúc, Đồng Bộ Trạng Thái URL, Tích Hợp API NestJS, Đa Ngôn Ngữ & Kiểm Thử Chrome CDP

---

## 1. TỔNG QUAN & MỤC TIÊU THIẾT KẾ

Module Tìm kiếm Bất động sản Công khai (Phase 2E-2B) là trang tìm kiếm và lọc danh sách bất động sản cốt lõi của nền tảng Batdongsan, phục vụ người dùng tìm kiếm nhà đất và cho thuê tại Việt Nam.

Trang kết quả tìm kiếm được triển khai theo cấu trúc route đa ngôn ngữ chuẩn Next.js 16:
- Tiếng Việt: `/[locale]/bat-dong-san` (`/vi/bat-dong-san`)
- Tiếng Anh: `/[locale]/bat-dong-san` (`/en/bat-dong-san`)

### 1.1. Mục Tiêu Cốt Lõi
1. **Source of Truth từ URL (URL-Driven State):** Toàn bộ trạng thái bộ lọc (loại giao dịch, loại hình, địa giới hành chính, khoảng giá, khoảng diện tích, phân trang) được lưu trữ đầy đủ trong URL Search Parameters. Người dùng có thể bookmark, sao chép URL hoặc chia sẻ trực tiếp cho người khác mà vẫn giữ nguyên kết quả tìm kiếm.
2. **Trung thực về dữ liệu (Data Truthfulness):** Kết nối trực tiếp vào Backend NestJS thật (`GET /api/listings`), chỉ truy vấn các trường hợp lệ được `QueryListingsDto` hỗ trợ (`status = APPROVED`). Không giả mạo số phòng ngủ, hướng nhà hay tọa độ bản đồ khi cơ sở dữ liệu chưa hỗ trợ. Các trường chưa có trong API được hiển thị minh bạch dưới dạng tính năng sắp ra mắt ("Sắp ra mắt" / "Coming Soon").
3. **Đa ngôn ngữ toàn diện (VI/EN):** Giao diện hỗ trợ song ngữ Tiếng Việt và Tiếng Anh. Định dạng tiền tệ VND được giữ nguyên (không đổi tỷ giá giả định sang USD), hiển thị trực quan theo đơn vị bản địa (`tỷ`, `triệu/tháng` ở VI; `B VND`, `M VND/month` ở EN). Tiêu đề và mô tả người dùng tạo được giữ nguyên văn bản gốc.
4. **Trải nghiệm hiển thị cao cấp:** Mô phỏng thiết kế Google Stitch (Screen ID: `a79d19efca5d499283ae8203dc185963`) với thẻ tin ngang (`ListingCard` biến thể `horizontal`), thanh tìm kiếm nhanh trên cùng, thanh lọc chuyên sâu bên trái (Desktop `w-[310px]`) và ngăn kéo bộ lọc trượt tiện lợi trên thiết bị di động (Mobile Drawer).

---

## 2. KIẾN TRÚC TỔNG THỂ & LUỒNG DỮ LIỆU

### 2.1. Sơ Đồ Kiến Trúc (Mermaid Sequence / Flowchart)

```mermaid
flowchart TD
    subgraph ClientBrowser["Trình Duyệt Người Dùng (Client Browser)"]
        Hero["HeroSearchBox (Trang Chủ)"] -->|Submit Form| NavSearch["URL: /vi/bat-dong-san?..."]
        NavSearch --> ServerRoute["Next.js Server Component (bat-dong-san/page.tsx)"]

        QuickBar["SearchQuickBar (Preset Filter)"] -->|router.push| NavSearch
        Sidebar["SearchFilterSidebar (Desktop)"] -->|router.push| NavSearch
        MobileDrawer["MobileFilterDrawer (Mobile)"] -->|router.push| NavSearch
        Tags["ActiveFilterTags (Remove / Clear All)"] -->|router.push| NavSearch
        Pagination["SearchPagination (Page Next/Prev)"] -->|Link href| NavSearch
    end

    subgraph NextServer["Next.js 16 App Router (BFF / SSR)"]
        ServerRoute --> ParseParams["parseListingsSearchParams(rawSearchParams)"]
        ParseParams --> FetchAPI["fetchPublicListings(query)"]
        FetchAPI -->|HTTP GET /api/listings| NestBackend["NestJS Backend API (Port 3001)"]
        NestBackend -->|Prisma Query| PostgreSQL["PostgreSQL 16 (Native Service)"]
        PostgreSQL -->|Records| NestBackend
        NestBackend -->|Envelope {data, meta}| FetchAPI
        FetchAPI --> SearchResultsView["SearchResultsView (Render Shell + Slices)"]
    end

    subgraph RenderView["Hiển Thị Kết Quả (UI View)"]
        SearchResultsView --> CardList["ListingCard (variant='horizontal')"]
        SearchResultsView --> EmptyView["SearchEmptyState (Khi total = 0)"]
        SearchResultsView --> ErrorView["SearchErrorState (Khi API lỗi)"]
    end
```

---

## 3. CÁC THÀNH PHẦN GIAO DIỆN CHÍNH (COMPONENT BREAKDOWN)

Mã nguồn của module tìm kiếm được tổ chức tách bạch tại thư mục `frontend/src/components/search/`:

| Tên Component | File | Trách nhiệm |
| :--- | :--- | :--- |
| **`SearchResultsView`** | `src/app/[locale]/bat-dong-san/page.tsx` | View chính bố cục 2 cột (Desktop) và 1 cột (Mobile), chứa Breadcrumbs, Title, Approved Listings Badge (`Tin đăng đã kiểm duyệt` / `Approved Listings`), QuickBar, Filter Sidebar, Results Header, Card List, Pagination và States. |
| **`SearchFilterSidebar`** | `src/components/search/SearchFilterSidebar.tsx` | Bảng điều khiển bộ lọc đa tiêu chí bên trái (Desktop `w-[310px]`). Bao gồm: Mua bán / Cho thuê, Địa giới hành chính (Tỉnh, Quận, Phường), Loại hình BĐS (Radio), Khoảng giá (Min-Max), Khoảng diện tích (Min-Max), nhóm bộ lọc sắp ra mắt và nút Áp dụng / Đặt lại. |
| **`SearchQuickBar`** | `src/components/search/SearchQuickBar.tsx` | Thanh tìm kiếm ngang trên cùng, cung cấp các nút chọn nhanh mức giá (ví dụ: Dưới 2 tỷ, 2 - 5 tỷ, v.v.), diện tích nhanh và loại hình BĐS. |
| **`MobileFilterDrawer`** | `src/components/search/MobileFilterDrawer.tsx` | Nút kích hoạt bộ lọc trên mobile kèm huy hiệu số bộ lọc đang chọn (`activeCount`), mở ngăn kéo trượt (`dialog` modal) có phông nền làm mờ (`backdrop-blur`). |
| **`SearchResultsHeader`** | `src/components/search/SearchResultsHeader.tsx` | Thanh tiêu đề kết quả: hiển thị huy hiệu tổng số tin tìm thấy (`{total} kết quả`), thông báo sắp xếp mặc định ("Mới nhất") và nút chuyển chế độ xem (Danh sách / Bản đồ sắp ra mắt). |
| **`ActiveFilterTags`** | `src/components/search/ActiveFilterTags.tsx` | Thanh thẻ bộ lọc đang áp dụng (Pills). Cho phép xóa từng điều kiện bằng nút `×` hoặc xóa tất cả bằng liên kết "Xóa tất cả". |
| **`ListingCard` (Horizontal)** | `src/components/home/ListingCard.tsx` | Thẻ tin đăng bất động sản với biến thể ngang (`variant="horizontal"`): ảnh bên trái (`w-[280px]` trên Desktop), thông tin giá, diện tích, loại hình, địa chỉ và ngày đăng bên phải. |
| **`SearchEmptyState`** | `src/components/search/SearchEmptyState.tsx` | Giao diện thân thiện khi không tìm thấy kết quả nào phù hợp, đi kèm nút bấm "Xóa bộ lọc" để người dùng đặt lại tìm kiếm. |
| **`SearchErrorState`** | `src/components/search/SearchErrorState.tsx` | Giao diện cảnh báo lỗi khi không kết nối được máy chủ Backend, kèm nút "Thử lại". |
| **`SearchSkeletonList`** | `src/components/search/SearchSkeletonList.tsx` | Khung xương tải trang (Skeleton Shimmer) mô phỏng các thẻ tin ngang trong lúc dữ liệu đang được truyền tải. |
| **`SearchPagination`** | `src/components/search/SearchPagination.tsx` | Phân trang trực quan, tự động bảo lưu toàn bộ tham số tìm kiếm hiện tại vào đường dẫn liên kết (`Link href`). |

---

## 4. XỬ LÝ SEARCH PARAMS & NEXT.JS 16 CACHE COMPONENTS

### 4.1. Thách Thức Khi Đọc Dynamic SearchParams Trong Next.js 16
Next.js 16 kích hoạt mặc định tính năng `cacheComponents: true` và `partialPrefetching: true`. Theo cơ chế này:
- Toàn bộ Shell tĩnh của trang được biên dịch trước (prerender).
- Việc đọc trực tiếp các tham số thời gian thực (`searchParams`, `cookies`, `headers`) mà không có chỉ dẫn có thể gây ra lỗi prerender:
  ```
  Error: Route "/[locale]/bat-dong-san": Next.js encountered uncached or runtime data during prerendering.
  ```

### 4.2. Giải Pháp Kỹ Thuật Đạt Chuẩn
1. Khai báo chỉ thị phân đoạn route:
   ```typescript
   // frontend/src/app/[locale]/bat-dong-san/page.tsx
   export const instant = false;
   ```
   Chỉ thị `export const instant = false;` thông báo cho trình thu thập trang của Next.js rằng trang này phụ thuộc vào `searchParams` động từ request của người dùng, cho phép render theo yêu cầu (Dynamic On-Demand `ƒ`) mà không xung đột với `cacheComponents`.
2. Hàm giải mã tham số an toàn `parseListingsSearchParams`:
   ```typescript
   export function parseListingsSearchParams(
     searchParams: Record<string, string | string[] | undefined>,
   ): PublicListingsQuery;
   ```
   Hàm này loại bỏ hoàn toàn các giá trị không hợp lệ (như giá âm, diện tích không phải số, enum sai cú pháp), đảm bảo DTO gửi sang Backend NestJS luôn hợp lệ 100%.

---

## 5. ĐỒNG BỘ DỮ LIỆU VỚI BACKEND NESTJS (`QueryListingsDto`)

Backend API `GET /api/listings` tuân thủ nghiêm ngặt DTO sau:

```typescript
export class QueryListingsDto {
  page?: number;               // Mặc định: 1
  limit?: number;              // Mặc định: 20 (Trang tìm kiếm dùng 10)
  province?: string;           // Khớp chính xác chuỗi địa giới
  district?: string;           // Khớp chính xác chuỗi địa giới
  ward?: string;               // Khớp chính xác chuỗi địa giới
  propertyType?: PropertyType; // APARTMENT | HOUSE | VILLA | LAND | COMMERCIAL | OTHER
  transactionType?: TransactionType; // FOR_SALE | FOR_RENT
  minPrice?: string;           // Chuỗi số nguyên dương regex: ^[1-9]\d*$
  maxPrice?: string;           // Chuỗi số nguyên dương regex: ^[1-9]\d*$
  minArea?: number;            // Số thực không âm
  maxArea?: number;            // Số thực không âm
}
```

### 5.1. Quy Tắc "Data Truthfulness" Đối Với Các Trường Chưa Được Hỗ Trợ
Thiết kế Google Stitch có hiển thị các bộ lọc như "Số phòng ngủ" (Bedrooms) và "Pháp lý" (Legal Status). Tuy nhiên, cơ sở dữ liệu và API Backend hiện tại chưa có các cột dữ liệu này.
- **Không tự bịa đặt dữ liệu:** Tuyệt đối không sinh dữ liệu giả (fake data) trong thẻ tin đăng.
- **Trình bày trung thực:** Trong `SearchFilterSidebar`, các mục Phòng ngủ và Pháp lý được đưa vào khối riêng có đánh dấu `(Sắp ra mắt)` và bị vô hiệu hóa (`disabled`, `cursor-not-allowed`).
- Điều này vừa tôn trọng thiết kế thị giác của Stitch, vừa đảm bảo tính trung thực tuyệt đối của dữ liệu thực tế.

---

## 6. ĐA NGÔN NGỮ (VI/EN) & ĐỊNH DẠNG BẢN ĐỊA

Tất cả chuỗi giao diện được quản lý tại `frontend/messages/vi.json` và `frontend/messages/en.json` dưới namespace `SearchResults`:

### 6.1. Nguyên Tắc Tiền Tệ & Định Dạng Số
- Không tự ý chuyển đổi tiền tệ sang USD bằng tỷ giá giả lập. Giá bán và giá thuê đều bằng đơn vị Việt Nam Đồng (VND).
- Tiếng Việt:
  - Giá bán: `3,2 tỷ`, `850 triệu`
  - Giá thuê: `15 triệu/tháng`, `135 triệu/quý`, `840 triệu/năm`
- Tiếng Anh:
  - Giá bán: `3.2B VND`, `850M VND`
  - Giá thuê: `15M VND/month`, `135M VND/quarter`, `840M VND/year`
- Nhãn phân loại:
  - `APARTMENT` + `FOR_SALE`: VI = "Bán căn hộ", EN = "Apartment for Sale"
  - `HOUSE` + `FOR_RENT`: VI = "Thuê nhà ở", EN = "House for Rent"
  - `COMMERCIAL` + `FOR_RENT`: VI = "Thuê mặt bằng / VP", EN = "Commercial for Rent"

---

## 7. KIỂM THỬ TỰ ĐỘNG & VERIFICATION TRÊN CHROME CDP

Hệ thống được bảo đảm chất lượng qua 2 tầng kiểm thử:

### 7.1. Tầng Kiểm Thử Đơn Vị & Tích Hợp (Vitest + React Testing Library)
Tệp `frontend/src/__tests__/search.test.tsx` bao gồm 19 kịch bản kiểm thử tự động chuyên sâu:
1. Giải mã Search Parameters hợp lệ và từ chối các enum sai cú pháp.
2. Kiểm tra biên phân trang (`page`, `limit`).
3. Kiểm tra logic xác thực khoảng giá và diện tích (`validateFilterRanges`).
4. Kiểm thử hiển thị danh sách thẻ tin dạng ngang ở Tiếng Việt.
5. Kiểm thử hiển thị danh sách thẻ tin ở Tiếng Anh (không lẫn chuỗi tiếng Việt).
6. Kiểm thử trạng thái rỗng (`SearchEmptyState`) và nút bấm xóa bộ lọc.
7. Kiểm thử trạng thái lỗi (`SearchErrorState`) khi máy chủ Backend gặp sự cố.
8. Kiểm thử gắn thẻ bộ lọc đang áp dụng (`ActiveFilterTags`) và xóa từng thẻ.
9. Kiểm thử tương tác Form: Nhập Min > Max hiển thị cảnh báo lỗi và chặn submit.
10. Kiểm thử mở và đóng ngăn kéo di động (`MobileFilterDrawer`) chuẩn Accessibility.
11. Kiểm thử tạo thẻ SEO Canonical URL và Alternate Hreflang.

Toàn bộ 12 tệp test suite của Frontend (102 test cases) đều vượt qua thành công 100%.

### 7.2. Tầng Chấp Nhận Trên Trình Duyệt Thật (Chrome CDP Smoke Test)
Script tự động hóa `browser-verify-search.mjs` chạy qua Chrome DevTools Protocol kiểm tra trực tiếp trên trình duyệt thật (Desktop `1440×900` và Mobile `390×844`):
- Kết nối tới NestJS Backend thật đang chạy trên cổng 3001 kết nối PostgreSQL 16.
- Đạt **0 lỗi Console**, **0 lỗi Hydration mismatch**, **0 lỗi tràn ngang (horizontal overflow)**.
- Toàn bộ 10 ảnh chụp màn hình kiểm định được lưu trữ tại `phase2e2b-search/`.

---

## 8. HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN PHÁT TRIỂN TIẾP THEO

Khi tiếp nhận codebase để phát triển Phase 2E-2C (Trang Chi tiết Bất động sản) hoặc mở rộng tính năng tìm kiếm:
1. **Liên kết chi tiết:** Mỗi thẻ tin đăng trong `ListingCard.tsx` đã được cấu hình liên kết ngữ cảnh đa ngôn ngữ trỏ tới:
   ```typescript
   <Link href={localizeHref(`/bat-dong-san/${listing.id}`)}>
   ```
2. **Khi Backend bổ sung full-text search hoặc sắp xếp động:**
   - Cập nhật `QueryListingsDto` tại Backend.
   - Bổ sung trường `keyword` và `sortBy` vào `parseListingsSearchParams` trong `frontend/src/lib/formatters.ts`.
   - Kết nối ô tìm kiếm từ khóa trong `SearchQuickBar.tsx`.
3. **Quy tắc an toàn Git:**
   - Luôn kiểm tra `git status -sb` và `git diff --check` trước khi thực hiện thay đổi.
   - Không được chạm vào hoặc xóa các tệp nhạy cảm untracked: `backend/check-db-fingerprint.mjs` và `phase2d2-review.patch`.
