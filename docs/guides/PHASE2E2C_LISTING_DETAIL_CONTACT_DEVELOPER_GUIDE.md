# HƯỚNG DẪN KỸ THUẬT DÀNH CHO LẬP TRÌNH VIÊN: MODULE CHI TIẾT BẤT ĐỘNG SẢN & GỬI YÊU CẦU LIÊN HỆ (PHASE 2E-2C)
## Kiến Trúc Component, Tích Hợp Next.js BFF, Luồng Chuyển Hướng returnTo, Bảo Mật Session HttpOnly & Kiểm Thử Chrome CDP

---

## 1. TỔNG QUAN & MỤC TIÊU THIẾT KẾ

Module Chi Tiết Bất Động Sản & Gửi Yêu Cầu Liên Hệ (Phase 2E-2C) là điểm hội tụ quan trọng trong hành trình khách hàng của nền tảng Batdongsan, kết nối trực tiếp từ Trang chủ (Homepage) và Trang tìm kiếm (Search Results) tới trải nghiệm xem chi tiết và chuyển đổi khách hàng tiềm năng (Lead Conversion).

Trang chi tiết được triển khai trên cấu trúc route động đa ngôn ngữ của Next.js 16 App Router:
- Tiếng Việt: `/[locale]/bat-dong-san/[id]` (Ví dụ: `/vi/bat-dong-san/seed_listing_01`)
- Tiếng Anh: `/[locale]/bat-dong-san/[id]` (Ví dụ: `/en/bat-dong-san/seed_listing_01`)

### 1.1. Mục Tiêu Cốt Lõi
1. **Trải nghiệm thị giác cao cấp theo thiết kế Google Stitch:** Tái hiện trung thực thiết kế Stitch Screen ID `ed439158f49c45a9a33d31e014de8d2a` ("Chi tiết bất động sản (Desktop)", Project ID: `13967597418813716400`) với thư viện ảnh lưới 12 cột, tỷ lệ vàng 65/35, lightbox phóng to toàn màn hình, thanh thông tin nổi bật và thẻ tư vấn dính (Sticky Sidebar).
2. **Trung thực về dữ liệu (Data Truthfulness & Privacy Boundary):**
   - Chỉ hiển thị dữ liệu thực tế được quản lý trong cơ sở dữ liệu PostgreSQL qua NestJS Backend (`GET /api/listings/:id`).
   - Tuyệt đối không tạo dữ liệu giả lập (fabricated) về số phòng ngủ, phòng tắm, hướng nhà hay tình trạng pháp lý khi schema chưa có các trường này.
   - Bảo vệ quyền riêng tư người bán: Không công khai địa chỉ số nhà hay tọa độ GPS chính xác. Chỉ hiển thị địa giới hành chính (Phường/Xã, Quận/Huyện, Tỉnh/Thành phố) và vùng bán kính ước lượng (~500m) kèm lời giải thích minh bạch.
3. **Mô hình BFF (Backend-for-Frontend) an toàn:**
   - Client Component không gọi trực tiếp tới NestJS port 3001 mà tương tác qua BFF Route `/api/contact-requests`.
   - Chuyển tiếp cookie xác thực HttpOnly `batdongsan_session` an toàn từ Server Next.js tới NestJS `POST /api/contact-requests`, không để lộ JWT token cho JavaScript phía trình duyệt.
4. **Hành trình người dùng liền mạch với `returnTo`:**
   - Khách vãng lai (chưa đăng nhập) được hướng dẫn đăng nhập thông qua liên kết chứa tham số an toàn `returnTo`.
   - Sau khi đăng nhập thành công tại `/vi/login`, hệ thống tự động đưa người dùng trở lại đúng trang chi tiết bất động sản đang xem để tiếp tục gửi yêu cầu tư vấn.

---

## 2. KIẾN TRÚC TỔNG THỂ & SƠ ĐỒ LUỒNG DỮ LIỆU

### 2.1. Sơ Đồ Kiến Trúc Hệ Thống (Architecture Flowchart)

```mermaid
flowchart TD
    subgraph ClientBrowser["Trình Duyệt Khách Hàng (Client Browser)"]
        NavSearch["Trang Tìm Kiếm / Trang Chủ"] -->|Click Listing Card| DetailPageURL["URL: /[locale]/bat-dong-san/[id]"]
        DetailPageURL --> NextServer["Next.js 16 Server Component (Page.tsx)"]

        subgraph DetailUI["Giao Diện Chi Tiết Bất Động Sản"]
            Gallery["PropertyGallery (Lưới ảnh 12 cột + Lightbox)"]
            Overview["PropertyOverview (H1, Giá VND, Đơn giá m², Badges)"]
            Description["PropertyDescription (Mô tả chi tiết)"]
            Specs["PropertySpecsTable (Bảng thông số xác thực)"]
            PrivacyNotice["PropertyLocationNotice (Bảo mật vị trí & Bán kính ~500m)"]
            ContactCard["PropertyContactCard (Thẻ tư vấn Sticky Sidebar)"]
        end
    end

    subgraph NextServerContext["Next.js Server (BFF / SSR / Metadata)"]
        NextServer --> LayoutMeta["generateMetadata (Canonical, Hreflang, OpenGraph)"]
        NextServer --> FetchDetail["fetchPublicListingDetail(id)"]
        FetchDetail -->|HTTP GET /api/listings/:id| NestListings["NestJS ListingsController (Port 3001)"]

        ContactCard -->|POST /api/contact-requests| BFFContactRoute["Next.js BFF Handler (/api/contact-requests/route.ts)"]
        BFFContactRoute -->|Extract batdongsan_session Cookie| ForwardReq["Chuyển tiếp HTTP POST kèm Authorization Bearer"]
    end

    subgraph BackendDatabase["NestJS Backend & Cơ Sở Dữ Liệu"]
        NestListings -->|Prisma findFirst status=APPROVED| DB[(PostgreSQL 16 Service)]
        ForwardReq -->|POST /api/contact-requests| NestContact["NestJS ContactRequestsController"]
        NestContact -->|Validate DTO, Consent, Roles, Self-Listing| DB
        DB -->|Tạo bản ghi ContactRequest| NestContact
        NestContact -->|HTTP 201 Created {id, status, ...}| BFFContactRoute
        BFFContactRoute -->|HTTP 201 JSON| ContactCard
    end
```

---

### 2.2. Sơ Đồ Trình Tự: Đăng Nhập & Chuyển Hướng returnTo (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách Chưa Đăng Nhập
    participant Detail as Trang Chi Tiết BĐS (/vi/bat-dong-san/id)
    participant Contact as PropertyContactCard
    participant Login as Trang Đăng Nhập (/vi/login?returnTo=...)
    participant BFFAuth as Next.js BFF (/api/auth/login)
    participant NestAuth as NestJS Auth Module (Port 3001)

    User->>Detail: Truy cập xem căn hộ
    Detail->>Contact: Render trạng thái chưa đăng nhập
    Contact-->>User: Hiển thị hộp thông báo & nút "Đăng nhập để gửi yêu cầu"
    User->>Contact: Click nút "Đăng nhập"
    Contact->>Login: Chuyển hướng kèm ?returnTo=%2Fvi%2Fbat-dong-san%2Fid
    User->>Login: Nhập email, mật khẩu & Submit form
    Login->>BFFAuth: POST /api/auth/login
    BFFAuth->>NestAuth: POST /api/auth/login
    NestAuth-->>BFFAuth: Trả về accessToken JWT & user info
    BFFAuth-->>Login: Set-Cookie batdongsan_session (HttpOnly) & 200 OK
    Note over Login: Kiểm tra an toàn safeReturnTo (bắt đầu bằng '/')
    Login->>Detail: router.push(safeReturnTo)
    Detail->>Contact: AuthContext phát hiện user đã xác thực
    Contact-->>User: Hiển thị form gửi tin nhắn tư vấn trực tiếp!
```

---

### 2.3. Sơ Đồ Trình Tự: Gửi Yêu Cầu Liên Hệ & Xử Lý Nghiệp Vụ (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Người Dùng (BUYER)
    participant Contact as PropertyContactCard
    participant BFF as Next.js BFF (/api/contact-requests)
    participant Nest as NestJS Backend (Port 3001)
    participant DB as PostgreSQL 16

    Buyer->>Contact: Nhập lời nhắn (tối đa 1000 ký tự)
    Buyer->>Contact: Tích chọn "Tôi đồng ý chia sẻ thông tin..."
    Buyer->>Contact: Click nút "Gửi yêu cầu tư vấn"
    Contact->>Contact: Kiểm tra client-side: consent=true, message <= 1000 chars
    Contact->>BFF: POST /api/contact-requests { listingId, message, contactConsent }
    Note over BFF: Đọc cookie HttpOnly batdongsan_session từ request headers
    alt Cookie không tồn tại
        BFF-->>Contact: HTTP 401 Unauthorized
    else Cookie hợp lệ
        BFF->>Nest: POST /api/contact-requests (Authorization: Bearer <token>)
        Note over Nest: JwtAuthGuard & RolesGuard
        alt User có Role ADMIN
            Nest-->>BFF: HTTP 403 Forbidden (Admin không được tạo contact request)
            BFF-->>Contact: HTTP 403 Forbidden
            Contact-->>Buyer: Hiển thị cảnh báo vai trò quản trị viên
        else User chính là chủ sở hữu tin đăng (Owner)
            Nest-->>BFF: HTTP 400 Bad Request ("Cannot contact your own listing")
            BFF-->>Contact: HTTP 400 Bad Request
            Contact-->>Buyer: Thông báo lỗi: Không thể gửi yêu cầu cho chính tin của bạn
        else Thông tin hợp lệ
            Nest->>DB: Prisma create contactRequest
            DB-->>Nest: Bản ghi đã lưu (ID: CMW60RP7...)
            Nest-->>BFF: HTTP 201 Created { id, listingId, status, createdAt }
            BFF-->>Contact: HTTP 201 Created { id, ... }
            Contact-->>Buyer: Hiển thị Success Banner màu xanh ngọc kèm mã yêu cầu!
        end
    end
```

---

## 3. CẤU TRÚC COMPONENT & PHÂN RÃ GIAO DIỆN

Thư mục `frontend/src/components/detail/` được chia nhỏ theo nguyên tắc đơn nhiệm (Single Responsibility Principle):

```
frontend/src/components/detail/
├── PropertyGallery.tsx        # Thư viện ảnh 12 cột, tỷ lệ 65/35 & Lightbox toàn màn hình
├── PropertyOverview.tsx       # Tiêu đề H1, giá VND, đơn giá m², 4 thông số & nút tương tác
├── PropertyDescription.tsx    # Nội dung mô tả chi tiết bất động sản
├── PropertySpecsTable.tsx     # Bảng đặc tả 2 cột thông số đã qua kiểm duyệt
├── PropertyLocationNotice.tsx # Hộp bảo mật quyền riêng tư & bản đồ bán kính hành chính
└── PropertyContactCard.tsx    # Thẻ tư vấn dính bên phải hỗ trợ 4 trạng thái tương tác
```

### 3.1. `PropertyGallery.tsx`
- **Lưới hiển thị Desktop:** Sử dụng CSS Grid 12 cột. Ảnh chính chiếm 8 cột (`lg:col-span-8`, ~65% chiều rộng), cụm 4 ảnh phụ bên phải chiếm 4 cột (`lg:col-span-4`, ~35% chiều rộng). Ảnh thứ 4 có lớp phủ `+N ảnh` khi tổng số ảnh vượt quá 5.
- **Tính trung thực dữ liệu huy hiệu (Data Truthfulness):** Không hiển thị các huy hiệu chưa có căn cứ trong cơ sở dữ liệu như "Xác thực" hay "Độc quyền" (vì schema Prisma và API backend chưa hỗ trợ trường `isVerified` hay `isExclusive`). Chỉ hiển thị nhãn tin kiểm duyệt chính thức khi tin đạt trạng thái `APPROVED`.
- **Responsive Mobile:** Trên màn hình nhỏ (`< 1024px`), ảnh chính chiếm toàn bộ chiều rộng, góc phải dưới xuất hiện badge `Ảnh 1 / N` có biểu tượng máy ảnh.
- **Accessible Lightbox Modal:**
  - Kích hoạt khi click vào bất kỳ ảnh nào trong thư viện.
  - Khóa cuộn trang `document.body.style.overflow = 'hidden'`.
  - Hỗ trợ đầy đủ phím tắt bàn phím: Phím `Escape` đóng modal, phím mũi tên `ArrowLeft` chuyển ảnh trước, phím `ArrowRight` chuyển ảnh tiếp theo.
  - Phía dưới có thanh cuộn hình thu nhỏ (thumbnail strip) cho phép nhảy tới ảnh bất kỳ.

### 3.2. `PropertyOverview.tsx`
- **Mã tin niêm yết chuẩn hóa:** Sử dụng hàm `formatListingReferenceCode(id)` tạo mã định danh duy nhất và xác định (deterministic). Xử lý trọn vẹn cả ID dạng chuỗi tiền tố (ví dụ: `seed_listing_01` -> `BDS-SEED01`, `seed_listing_02` -> `BDS-SEED02`) lẫn ID dạng UUID chuẩn (ví dụ: `BDS-A79D5963`), loại bỏ nguy cơ trùng lặp mã khi cắt chuỗi.
- **Hiển thị giá chuẩn hóa:**
  - Sử dụng hàm `formatVndPrice` với các quy tắc bản địa: `>= 1 tỷ` hiển thị `tỷ` (VI) hoặc `B VND` (EN), `< 1 tỷ` hiển thị `triệu` (VI) hoặc `M VND` (EN).
  - Đơn giá trên mét vuông: Tính toán chuẩn xác `~ X tr/m²` (VI) hoặc `~ X M VND/m²` (EN).
- **4 Thông số cốt lõi:**
  1. *Diện tích:* Đơn vị `m²`.
  2. *Loại hình:* Căn hộ, Nhà phố, Biệt thự, Đất nền, v.v.
  3. *Địa phương:* Tên Quận/Huyện, Tỉnh/Thành phố.
  4. *Cập nhật:* Ngày cập nhật gần nhất theo định dạng bản địa (`dd/MM/yyyy`).
- **Nút tương tác:**
  - Nút *Lưu tin (Favorite):* Do backend hiện tại chưa cung cấp API endpoint quản lý danh sách yêu thích (`SavedListing`), nút này được thiết kế trung thực ở trạng thái tính năng sắp ra mắt (`disabled`, `aria-disabled="true"`, nhãn `Lưu (Sắp ra mắt)` kèm chú thích tooltip).
  - Nút *Chia sẻ (Share):* Sao chép URL hiện tại vào Clipboard kèm thông báo phản hồi "Đã chép liên kết" trong 2.5 giây.

### 3.3. `PropertyDescription.tsx`
- Tự động tách các đoạn văn bản theo ký tự xuống dòng (`\n\n` hoặc `\n`), loại bỏ khoảng trắng thừa và bọc trong thẻ `<p>` có khoảng cách `leading-relaxed` giúp người dùng đọc tin thoải mái trên mọi kích thước màn hình.

### 3.4. `PropertySpecsTable.tsx`
- Bảng thông số kỹ thuật 2 cột chuẩn hóa, phân tách đường viền mềm mại `#E2E8F0`.
- **Nguyên tắc bảo vệ tính trung thực dữ liệu:**
  - Chỉ render các trường có thực trong database: Loại BĐS, Loại giao dịch, Diện tích, Mức giá, Giá/m², Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Trạng thái duyệt, Ngày đăng, Ngày cập nhật.
  - Không sinh thêm số phòng ngủ, số nhà tắm, hướng cửa chính, hướng ban công hay tình trạng sổ hồng khi chưa có trong schema backend.

### 3.5. `PropertyLocationNotice.tsx`
- **Hộp thoại bảo vệ quyền riêng tư người bán:** Giải thích lý do địa chỉ chính xác không được hiển thị công khai nhằm phòng tránh tiếp cận trái phép và bảo vệ an toàn thông tin cá nhân.
- **Đồ họa mô phỏng bán kính (Minh họa khu vực):** Khối sandbox hiển thị lưới tọa độ chấm tròn, vòng tròn hiệu ứng phát xung (pulse effect) kèm biểu tượng `location_searching` đại diện cho bán kính hành chính mô phỏng ước tính ~500m (minh họa, không dùng để điều hướng GPS chính xác). Vị trí chính xác sẽ được chuyên viên cung cấp khi đặt lịch xem nhà thực tế.

### 3.6. `PropertyContactCard.tsx`
- Thẻ tư vấn dính bên phải (`sticky top-24`), luôn nổi bật khi người dùng cuộn xem nội dung chi tiết.
- Quản lý đồng bộ 4 trạng thái giao diện:
  1. **Khách vãng lai:** Hiển thị hướng dẫn đăng nhập cùng nút bấm chuyển hướng `/login?returnTo=...` và liên kết tạo tài khoản `/register?returnTo=...`.
  2. **Quản trị viên (ADMIN):** Hiển thị thông báo màu hổ phách cảnh báo tài khoản Admin không được phép gửi yêu cầu tư vấn cho tin đăng.
  3. **Người dùng đã đăng nhập (BUYER / OWNER / AGENT):**
     - Banner hiển thị danh tính: Họ tên, email và nhãn vai trò tương ứng.
     - Ô nhập lời nhắn (textarea) có bộ đếm ký tự thực tế `X/1000`.
     - Ô checkbox cam kết đồng ý chia sẻ thông tin liên lạc (bắt buộc). Nút gửi bị vô hiệu hóa (`disabled`) khi chưa tích chọn.
     - Xử lý trạng thái đang gửi (`isSubmitting`) với biểu tượng xoay (spinner).
  4. **Gửi thành công:** Hiển thị biểu tượng `check_circle`, tiêu đề chúc mừng, thông báo ghi nhận kèm mã yêu cầu và nút "Gửi yêu cầu khác" để reset form.

---

## 4. TÍCH HỢP BACKEND QUA NEXT.JS BFF ROUTE

### 4.1. Handler Route `/api/contact-requests/route.ts`

```typescript
// frontend/src/app/api/contact-requests/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, message: 'Vui lòng đăng nhập để gửi yêu cầu liên hệ.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { listingId, message, contactConsent } = body ?? {};

    if (!listingId || contactConsent !== true) {
      return NextResponse.json(
        { statusCode: 400, message: 'Dữ liệu yêu cầu liên hệ không hợp lệ.' },
        { status: 400 },
      );
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/contact-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify({ listingId, message, contactConsent: true }),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { statusCode: 500, message: 'Không thể gửi yêu cầu liên hệ.', error: errorMsg },
      { status: 500 },
    );
  }
}
```

### 4.2. Bảo Mật Luồng returnTo Chống Open Redirect
Tại các trang `LoginPage` (`frontend/src/app/[locale]/login/page.tsx`) và `RegisterPage` (`frontend/src/app/[locale]/register/page.tsx`):

```typescript
const searchParams = useSearchParams();
const rawReturnTo = searchParams?.get('returnTo') ?? null;

// Kiểm tra nghiêm ngặt: Phải bắt đầu bằng '/' nhưng KHÔNG ĐƯỢC bắt đầu bằng '//'
const safeReturnTo =
  rawReturnTo &&
  rawReturnTo.startsWith('/') &&
  !rawReturnTo.startsWith('//')
    ? rawReturnTo
    : null;

// Sau khi đăng nhập thành công:
if (safeReturnTo) {
  router.push(safeReturnTo);
} else {
  router.push(localizeHref('/'));
}
```

---

## 5. BỘ TỪ ĐIỂN ĐA NGÔN NGỮ (I18N METADATA & MESSAGES)

Dữ liệu ngôn ngữ cho trang chi tiết được quy hoạch tại namespace `PropertyDetail` trong cả hai tệp:
- `frontend/messages/vi.json`
- `frontend/messages/en.json`

Metadata SEO được khởi tạo qua hàm `buildLocalizedListingDetailMetadata` tại `frontend/src/i18n/metadata.ts`:
- **Canonical URL:** Tự động tạo URL tuyệt đối trỏ về phiên bản ngôn ngữ hiện hành.
- **Hreflang Alternates:** Cung cấp đầy đủ liên kết `vi`, `en`, và `x-default` (mặc định về Tiếng Việt).
- **OpenGraph:** Thiết lập thẻ `og:title`, `og:description`, `og:url`, `og:type = article` và ảnh đại diện bất động sản phục vụ chia sẻ lên Zalo, Facebook, LinkedIn.

---

## 6. HỆ THỐNG KIỂM THỬ TOÀN DIỆN & TRÌNH DUYỆT CHROME CDP

Toàn bộ giải pháp được bảo chứng qua 2 tầng kiểm thử:

### 6.1. Unit & Integration Test Suite (Vitest)
- **19 bài kiểm thử Component:** `frontend/src/__tests__/detail.test.tsx`
  - Render đầy đủ thư viện ảnh, các huy hiệu bảo chứng và cụm ảnh thu nhỏ.
  - Mở Lightbox Modal, chuyển ảnh trước/sau và đóng bằng phím `Escape`.
  - Hiển thị đúng giá VND, đơn giá m² và 4 thông số cốt lõi.
  - Xử lý sao chép clipboard và hiển thị phản hồi.
  - Hiển thị mô tả và thông báo bảo vệ vị trí.
  - Hiển thị đúng các trạng thái của thẻ tư vấn: Khách vãng lai, Admin, Đã đăng nhập và Gửi thành công.
- **7 bài kiểm thử BFF API:** `frontend/src/__tests__/bff-contact-requests.test.ts`
  - Kiểm tra từ chối khi thiếu session cookie (HTTP 401).
  - Kiểm tra từ chối khi thiếu `listingId` hoặc `contactConsent: false` (HTTP 400).
  - Kiểm tra chuyển tiếp Bearer token và xử lý đúng mã lỗi từ NestJS (HTTP 201, 403, 400, 500).

### 6.2. Kiểm Thử Trình Duyệt Thực Tế Bằng Chrome CDP
Kịch bản tự động `scratch/browser-verify-detail.mjs` chạy trực tiếp trên Google Chrome:

| Kịch Bản | Mục Tiêu Kiểm Thử | Tệp Ảnh Minh Chứng | Kết Quả |
| :--- | :--- | :--- | :---: |
| **Kịch bản 1** | Chi tiết Desktop Tiếng Việt (`/vi/bat-dong-san/seed_listing_01`) | `01-vi-detail-desktop.png` | **100% PASS** |
| **Kịch bản 2** | Chi tiết Desktop Tiếng Anh (`/en/bat-dong-san/seed_listing_01`) | `02-en-detail-desktop.png` | **100% PASS** |
| **Kịch bản 3** | Mở Lightbox Modal, đếm ảnh `1 / 2`, đóng bằng phím `Escape` | `03-vi-lightbox-modal-desktop.png` | **100% PASS** |
| **Kịch bản 4** | Khách vãng lai kiểm tra liên kết đăng nhập kèm `returnTo` | `04-vi-login-return-to-desktop.png` | **100% PASS** |
| **Kịch bản 5** | Đăng nhập tài khoản Buyer, tự động chuyển hướng về trang chi tiết | `05-vi-detail-authenticated-desktop.png` | **100% PASS** |
| **Kịch bản 6** | Gửi form yêu cầu tư vấn kèm cam kết, hiển thị mã `CMW60RP7` | `06-vi-contact-request-success-desktop.png` | **100% PASS** |
| **Kịch bản 7** | Giao diện Không tìm thấy (404) khi ID không tồn tại hoặc chưa duyệt | `07-vi-detail-not-found-desktop.png` | **100% PASS** |
| **Kịch bản 8** | Giao diện hiển thị Responsive Mobile trên khung hình 390x844 | `08-vi-detail-mobile.png` | **100% PASS** |

---

## 7. QUY TRÌNH BẢO TRÌ & GỠ LỖI DÀNH CHO KỸ SƯ MỚI

1. **Khởi động môi trường cục bộ:**
   - Đảm bảo service `postgresql-x64-16` đang chạy trên cổng 5432.
   - Khởi động backend NestJS: `npm --prefix backend run start:dev` (hoặc `start:prod`).
   - Khởi động frontend Next.js: `npm --prefix frontend run dev` (hoặc `build` + `start`).
2. **Kiểm tra route chi tiết:**
   - Truy cập `http://localhost:3000/vi/bat-dong-san/seed_listing_01`.
   - Đăng nhập thử với `buyer@example.test` / `DemoPassword123!`.
3. **Lưu ý tương thích Next.js 16 App Router:**
   - Trang chi tiết và các layout liên quan có sử dụng Client Hooks (`useSearchParams`) bắt buộc phải bọc trong `<Suspense fallback={null}>` và khai báo `export const instant = false;` để hỗ trợ cơ chế render streaming ổn định.
   - Không khai báo đồng thời `export const dynamic = 'force-dynamic'` khi `next.config.ts` đang kích hoạt `cacheComponents`.
