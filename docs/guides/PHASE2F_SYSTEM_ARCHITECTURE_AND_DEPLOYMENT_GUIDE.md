# HƯỚNG DẪN KIẾN TRÚC HỆ THỐNG & TRIỂN KHAI VẬN HÀNH — PHASE 2F
## Nền Tảng Bất Động Sản Batdongsan (Next.js 16 BFF, NestJS 12, PostgreSQL 16 & Prisma 7)

Tài liệu này tổng hợp kiến trúc toàn hệ thống, mô hình bảo mật **Backend-for-Frontend (BFF)**, ma trận phân quyền **RBAC**, cấu hình **SEO & Security Headers**, danh mục biến môi trường và quy trình triển khai / vận hành PostgreSQL sau khi hoàn tất kiểm thử tích hợp toàn hệ thống (Phase 2F).

---

## 1. KIẾN TRÚC TỔNG THỂ HỆ THỐNG

Hệ thống Batdongsan được thiết kế theo mô hình **3 tầng tách biệt (Frontend Next.js 16 App Router + BFF, Backend API NestJS 12, Cơ sở dữ liệu PostgreSQL 16 + Prisma 7)**:

```mermaid
flowchart LR
    U["Trình duyệt (Buyer / Owner / Agent / Admin)"] -->|"HTTPS + HttpOnly Cookie (batdongsan_session)"| FE["Next.js 16 App Router\n[locale]: /vi, /en\nnext-intl + Security Headers + SEO"]
    FE -->|"SSR / Client fetch qua /api/*"| BFF["Next.js Route Handlers (BFF)\n/api/auth/*, /api/listings/*,\n/api/contact-requests/*, /api/mls/*,\n/api/admin/*, /api/assistant/chat"]
    BFF -->|"HTTP REST + Authorization: Bearer JWT"| BE["NestJS 12 API (/api/*)\nValidationPipe (whitelist + forbidNonWhitelisted)"]
    BFF -.->|"Optional Server-only LLM Summary"| LLM["Gemini / OpenAI API\n(GEMINI_API_KEY / OPENAI_API_KEY)"]
    BE -->|"PrismaClient (@prisma/adapter-pg)"| DB[("PostgreSQL 16\nUsers, Listings, MlsShares,\nContactRequests, RequestAssignments,\nModerationLogs, AuditLogs")]
```

### 1.1 Các thành phần cốt lõi
1. **Frontend & BFF (`frontend/`, Next.js `16.4.2`, React `19.3.0`, `next-intl` `^4.14.9`):**
   - Hỗ trợ song ngữ với tiền tố bắt buộc (`localePrefix: 'always'`): `vi` (mặc định) và `en` tại `frontend/src/i18n/routing.ts`.
   - Các trang App Router dưới `frontend/src/app/[locale]/`:
     - Trang chủ & Tìm kiếm công khai: `/[locale]`, `/[locale]/bat-dong-san`, `/[locale]/bat-dong-san/[id]`.
     - Xác thực: `/[locale]/login`, `/[locale]/register`.
     - Cổng làm việc nội bộ (Workspace): `/[locale]/quan-ly` (alias `/[locale]/workspace`).
     - Cổng quản trị & kiểm duyệt (Admin): `/[locale]/quan-tri` (alias `/[locale]/admin`).
   - Lớp trung gian BFF (`frontend/src/app/api/`):
     - `auth/*`: Quản lý phiên qua cookie `batdongsan_session` (HttpOnly).
     - `listings/*`: Truy vấn công khai tin `APPROVED` và quản lý tin cá nhân.
     - `contact-requests/*`: Gửi yêu cầu liên hệ (Buyer) và xử lý lead được giao (Agent).
     - `mls/*`: Chia sẻ MLS nội bộ (`VIEW` / `MANAGE`).
     - `admin/*`: Kiểm duyệt tin đăng, điều phối/mở lại contact request, giám sát/thu hồi MLS, quản lý người dùng.
     - `assistant/chat`: AI Property Assistant neo trên dữ liệu `GET /api/listings` (`APPROVED`).
2. **Backend (`backend/`, NestJS `12.0.1`, Oxlint, Vitest):**
   - Khởi tạo tại `backend/src/main.ts` với global prefix `'api'`, bật CORS theo `CORS_ORIGIN` (`credentials: true`) và `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
   - Cấu trúc module trong `backend/src/app.module.ts`: `PrismaModule`, `AuthModule`, `ListingsModule`, `MlsModule`, `ContactRequestsModule`, `UsersModule`.
3. **Database (`database/`, Prisma `7.10.1` + `@prisma/adapter-pg` + PostgreSQL 16):**
   - Schema tại `database/prisma/schema.prisma`, cấu hình CLI tại `database/prisma.config.ts`.
   - Sinh Prisma Client ESM trực tiếp sang `backend/src/generated/prisma`.

---

## 2. MA TRẬN PHÂN QUYỀN (RBAC) & VÒNG ĐỜI NGHIỆP VỤ

Quyền thực thi (`Role` enum trong `database/prisma/schema.prisma`) hoàn toàn do **Admin** cấp, tách biệt với ý định chọn khi đăng ký (`RegistrationIntent`: `BUYER`, `OWNER`, `AGENT`). Mặc định tài khoản mới đăng ký có role `BUYER`.

| Vai trò (`Role`) | Trang công khai & AI Assistant | Gửi yêu cầu liên hệ (`ContactRequest`) | Quản lý tin đăng (`Listing`) | Cộng tác MLS (`MlsShare`) | Xử lý Lead (`RequestAssignment`) | Kiểm duyệt & Quản trị hệ thống |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Khách (Unauthenticated)** | Xem tin `APPROVED`, dùng AI Assistant | Chuyển hướng tới `/[locale]/login?returnTo=...` | ❌ | ❌ | ❌ | ❌ |
| **`BUYER`** | Xem tin `APPROVED`, dùng AI Assistant | Gửi yêu cầu với `contactConsent: true` | ❌ | ❌ | ❌ (Chỉ xem yêu cầu của mình) | ❌ (Chặn vào `/quan-tri`) |
| **`OWNER`** | Xem tin `APPROVED`, dùng AI Assistant | Có thể gửi (trừ tin do chính mình sở hữu) | Tạo `DRAFT`, sửa, gửi `PENDING`, lưu trữ (`ARCHIVED`) | Chia sẻ `VIEW` / `MANAGE` cho tin mình sở hữu | ❌ | ❌ |
| **`AGENT`** | Xem tin `APPROVED`, dùng AI Assistant | Có thể gửi (trừ tin do chính mình sở hữu) | Tạo/quản lý tin cá nhân tương tự `OWNER` | Nhận chia sẻ từ Owner; `VIEW` ẩn `streetAddress`, `MANAGE` được phép cập nhật | Xem lead được phân công, cập nhật trạng thái (`IN_PROGRESS`, `COMPLETED`, `REJECTED`), xem SĐT/Email người mua khi có consent | ❌ |
| **`ADMIN`** | Toàn quyền xem | Quản lý / điều phối tất cả | Duyệt `PENDING -> APPROVED`, từ chối kèm lý do (`REJECTED`) | Xem danh sách & thu hồi (`Revoke`) chia sẻ MLS | Giao lại hoặc mở lại yêu cầu (`Dispatch` / `Reopen`) | Quản lý User (`Role`), xem `ModerationLog` / `AuditLog` |

### Lưu ý bảo mật ẩn danh & đồng thuận:
- **Public Detail & AI Assistant:** Tin đăng `APPROVED` công khai và kết quả `toAssistantRecommendation()` chỉ trả về vị trí cấp hành chính (`province`, `district`, `ward`), tuyệt đối không làm lộ `streetAddress`, `latitude`, `longitude`, `ownerId`, email hay SĐT chủ tin.
- **MLS Permission:** Quyền `VIEW` giúp môi giới xem thông tin bán hàng nhưng vẫn ẩn `streetAddress` ở chế độ xem công cộng/hợp tác hạn chế; chỉ khi có quyền hợp lệ mới được thao tác `MANAGE`.
- **Contact Consent:** Người mua bắt buộc xác nhận đồng thuận (`contactConsent: true`) trước khi hệ thống cho phép tạo yêu cầu liên hệ và hiển thị thông tin liên hệ tới Agent được giao.

---

## 3. BẢO MẬT BFF, HTTP HEADERS & CẤU HÌNH SEO

### 3.1 Cơ chế HttpOnly Cookie & Che giấu lỗi (BFF)
- Khi đăng nhập tại `POST /api/auth/login` (`frontend/src/app/api/auth/login/route.ts`), BFF chỉ nhận và chuyển tiếp `email`, `password` sang NestJS `/api/auth/login`, sau đó lưu `accessToken` vào cookie **`batdongsan_session`**:
  - `httpOnly: true` (JavaScript phía trình duyệt không thể đọc token, chống XSS).
  - `sameSite: 'lax'`, `path: '/'`.
  - `secure: process.env.NODE_ENV === 'production'`.
  - Thời hạn khớp `exp` trong JWT nếu `rememberMe` được bật, hoặc session cookie nếu không chọn.
- Khi gọi `/api/auth/me`, BFF đọc `batdongsan_session` và gửi `Authorization: Bearer <token>` tới backend; nếu backend trả `401`, BFF chủ động xóa cookie.
- Tất cả route BFF (`login`, `register`, `me`, `contact-requests`, `admin/*`, `assistant/chat`) đều bắt ngoại lệ nội bộ ở khối `catch` và chỉ trả về HTTP `500` với `error: 'Internal Server Error'`, không làm lộ `error.message` hay stack trace ra client.

### 3.2 Baseline HTTP Security Headers (`frontend/next.config.ts`)
Hàm `async headers()` áp dụng cho toàn bộ đường dẫn `/(.*)`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 3.3 Cấu hình SEO (`robots.ts` & `sitemap.ts`)
- **`frontend/src/app/robots.ts`:**
  - `allow`: `'/'`, `'/vi'`, `'/en'`, `'/vi/bat-dong-san'`, `'/en/bat-dong-san'`.
  - `disallow`: `'/admin'`, `'/vi/admin'`, `'/en/admin'`, `'/quan-tri'`, `'/vi/quan-tri'`, `'/en/quan-tri'`, `'/quan-ly'`, `'/vi/quan-ly'`, `'/en/quan-ly'`, `'/workspace'`, `'/vi/workspace'`, `'/en/workspace'`, `'/api/'`.
  - Gắn `sitemap: <NEXT_PUBLIC_SITE_URL>/sitemap.xml` khi `NEXT_PUBLIC_SITE_URL` được cấu hình.
- **`frontend/src/app/sitemap.ts`:**
  - Nếu `getSiteBaseUrl()` trả về rỗng (ví dụ chưa cấu hình `NEXT_PUBLIC_SITE_URL` ở production), trả về mảng `[]` để tránh xuất URL `localhost`.
  - Khi có base URL hợp lệ, xuất các route công khai đa ngôn ngữ `/vi`, `/en`, `/vi/bat-dong-san`, `/en/bat-dong-san`.

---

## 4. DANH MỤC BIẾN MÔI TRƯỜNG (`.env.example`)

| Phân hệ | Tệp mẫu | Biến môi trường | Ý nghĩa & Lưu ý bảo mật |
| :--- | :--- | :--- | :--- |
| **Database** | `database/.env.example` | `DATABASE_URL` | Chuỗi kết nối PostgreSQL (`postgresql://postgres:YOUR_PASSWORD@localhost:5432/batdongsan?schema=public`) |
| **Database** | `database/.env.example` | `SEED_DEMO_PASSWORD` | Mật khẩu bắt buộc cho seed dữ liệu phát triển (script từ chối chạy nếu thiếu hoặc còn placeholder) |
| **Backend** | `backend/.env.example` | `DATABASE_URL` | Chuỗi kết nối PostgreSQL cho NestJS / Prisma |
| **Backend** | `backend/.env.example` | `PORT` | Cổng HTTP NestJS (mặc định `3001`) |
| **Backend** | `backend/.env.example` | `CORS_ORIGIN` | Origin Frontend được phép gọi API (`http://localhost:3000` ở local, URL chính thức ở prod) |
| **Backend** | `backend/.env.example` | `JWT_SECRET` | Khóa bí mật ký JWT (bắt buộc thay chuỗi ngẫu nhiên mạnh khi lên production) |
| **Backend** | `backend/.env.example` | `JWT_EXPIRES_IN` | Thời hạn access token (mẫu: `15m`) |
| **Backend** | `backend/.env.example` | `JWT_REFRESH_EXPIRES_IN` | Thời hạn refresh token (mẫu: `7d`) |
| **Backend** | `backend/.env.example` | `NODE_ENV` | `development` hoặc `production` |
| **Frontend** | `frontend/.env.example` | `NEXT_PUBLIC_API_BASE_URL` | URL NestJS Backend mà Server/BFF gọi tới (`http://localhost:3001`) |
| **Frontend** | `frontend/.env.example` | `NEXT_PUBLIC_SITE_URL` | URL công khai của Frontend (để trống ở local; bắt buộc đặt domain thật ở production để sinh canonical/`robots.txt`/`sitemap.xml`) |
| **Frontend** | `frontend/.env.example` | `PORT` | Cổng chạy Next.js (mặc định `3000`) |
| **Frontend** | `frontend/.env.example` | `GEMINI_API_KEY`, `OPENAI_API_KEY` | **Tùy chọn, chỉ chạy phía server.** Không gắn `NEXT_PUBLIC_`; dùng cho AI Assistant tóm tắt câu trả lời nếu có |

---

## 5. QUY TRÌNH TRIỂN KHAI & VẬN HÀNH CƠ SỞ DỮ LIỆU

### 5.1 Chuẩn bị & Di trú PostgreSQL (Thư mục `database/`)
1. Kiểm tra schema và sinh Prisma Client (output sang `backend/src/generated/prisma`):
   ```bash
   npm --prefix database run prisma:validate
   npm --prefix database run prisma:generate
   ```
2. Ở môi trường **Production** (chỉ áp dụng migration đã chốt, không tạo migration mới hay reset dữ liệu):
   ```bash
   npm --prefix database run prisma:migrate:deploy
   ```
3. Ở môi trường **Local Development** (khi phát triển thêm bảng hoặc nạp dữ liệu mẫu):
   ```bash
   npm --prefix database run prisma:migrate:dev
   npm --prefix database run prisma:seed
   ```
4. **Sao lưu (Backup) PostgreSQL trước khi nâng cấp / deploy:**
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f "batdongsan_backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
   Khôi phục khi cần thiết bằng `pg_restore -d "$DATABASE_URL" --clean --if-exists <file.dump>`.

### 5.2 Build & Khởi chạy Production
1. **Kiểm tra cấu hình môi trường:** Đảm bảo không dùng giá trị mẫu ở `JWT_SECRET`, đặt `NODE_ENV=production`, `CORS_ORIGIN=https://<domain>`, `NEXT_PUBLIC_SITE_URL=https://<domain>`.
2. **Build Backend & Frontend:**
   ```bash
   npm --prefix backend run build
   npm --prefix frontend run build
   ```
3. **Khởi chạy dịch vụ:**
   ```bash
   npm --prefix backend run start:prod   # Lắng nghe cổng 3001 (/api)
   npm --prefix frontend run start       # Lắng nghe cổng 3000
   ```
4. **Checklist nghiệm thu sau khi deploy:**
   - Truy cập `/robots.txt` và `/sitemap.xml` xác nhận domain production và các rule chặn `/admin`, `/quan-tri`, `/quan-ly`, `/workspace`, `/api/`.
   - Kiểm tra response headers có `X-Frame-Options: DENY` và `X-Content-Type-Options: nosniff`.
   - Kiểm tra cookie `batdongsan_session` sau khi đăng nhập có đủ cờ `HttpOnly` và `Secure` (trên HTTPS).
   - Theo dõi lỗ hổng phụ thuộc runtime định kỳ bằng `npm --prefix frontend audit --omit=dev` và `npm --prefix backend audit --omit=dev` (hiện tại `backend` ghi nhận 3 cảnh báo high ở gói truyền tải gián tiếp `body-parser` và `multer` qua `@nestjs/platform-express`; cần nâng cấp theo lộ trình bảo trì định kỳ khi `@nestjs/platform-express` phát hành bản vá tương thích).
