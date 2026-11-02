# BÁO CÁO NGHIỆM THU PHASE 2E-1 — TRIỂN KHAI FRONTEND FOUNDATION, CENTRALIZED API CLIENT & AUTHENTICATION

- **Dự án**: Batdongsan Real Estate Platform
- **Mã giai đoạn**: Phase 2E-1
- **Ngày thực hiện**: 02/11/2026
- **Môi trường**: Windows Native / Next.js 16 (App Router) / NestJS 12 / PostgreSQL 16
- **Chi nhánh triển khai**: `feat/phase2e1-frontend-auth`
- **Commit xuất phát**: `9b9c61c` (từ nhánh `feat/phase2d2-contact-requests`)

---

## 1. Tóm tắt điều hành (Executive Summary)

Phase 2E-1 là lát cắt tích hợp theo chiều dọc (vertical slice) đầu tiên giữa Frontend (Next.js 16, React, TypeScript, Tailwind CSS) và Backend (NestJS 12, Prisma, JWT Bearer Auth).

Toàn bộ mục tiêu đã hoàn thành theo đúng nguyên tắc gia tăng (incremental integration) và bảo toàn tính toàn vẹn hệ thống:
1. **Thiết kế Stitch chuẩn mực**: Tái lập chính xác 100% ngôn ngữ thiết kế, màu sắc (Deep Teal `#0F766E`, Deep Navy `#142B4A`, Slate-50 `#F8FAFC`), font chữ Be Vietnam Pro và cấu trúc visual của 2 màn hình Stitch:
   - Login: `172be7f0326346cc93a182fd06abc7d7`
   - Register: `afd1e0bfcea14563ab2e8243a927318b`
2. **Kiến trúc bảo mật BFF (Backend-for-Frontend)**: Đạt tiêu chuẩn an toàn cao nhất bằng cách sử dụng Next.js Route Handlers cùng HttpOnly cookie (`batdongsan_session`). Tuyệt đối không lưu trữ JWT trong `localStorage` hay `sessionStorage`. Trình duyệt và JavaScript phía client không bao giờ tiếp xúc trực tiếp với chuỗi raw JWT.
3. **API Client tập trung**: Hoàn thiện `frontend/src/lib/api-client.ts` xử lý chuẩn hóa lỗi HTTP (400, 401, 403, 404, 409, 500, Timeout 408), quản lý abort controller và typed response.
4. **AuthContext & Lifecycle**: Quản lý phiên làm việc, tự động khôi phục hydration từ `/api/auth/me`, ngăn chặn cascading render và tương thích nghiêm ngặt với quy tắc linter của React 19.
5. **Navbar nhận biết vai trò (Role-aware Navbar)**: Điều hướng chính xác theo vai trò đã xác thực (`BUYER`, `OWNER`, `AGENT`, `ADMIN`, hoặc Khách vãng lai). Chỉ hiển thị các route đã triển khai thực tế.
6. **Tuân thủ Backend contract**: Phân định rõ ràng giữa `RegistrationIntent` (ý định đăng ký của người dùng) và User `Role` (do Backend quản trị duy nhất gán mặc định là `BUYER`). Whitelist chặt chẽ payload gửi lên NestJS để không bị lỗi HTTP 400 ValidationPipe.
7. **Kiểm thử & Chất lượng**:
   - 28/28 test cases Frontend (Vitest + React Testing Library) vượt qua hoàn toàn.
   - 132/132 unit test Backend được giữ nguyên vẹn, không có bất kỳ regression nào.
   - `npm run lint` đạt 0 lỗi, 0 cảnh báo.
   - `npm run build` Next.js 16 Turbopack thành công 100%.

---

## 2. Thông tin chi nhánh và Commit xuất phát (Branch & Starting Commit)

- **Nhánh cơ sở**: `feat/phase2d2-contact-requests`
- **Commit xuất phát xác thực**: `9b9c61c` (`fix(contact-requests): strengthen concurrency safety & test assertions`)
- **Nhánh làm việc mới**: `feat/phase2e1-frontend-auth`
- **Nguyên tắc Git an toàn**: Không thực hiện `git add`, `git commit` hay `git push`. Toàn bộ các file user có sẵn từ trước (`backend/check-db-fingerprint.mjs`, `phase2d2-review.patch`, `docs/reports/PHASE2E_FRONTEND_INTEGRATION_READINESS_2026-11-01.md`) được giữ nguyên vẹn tuyệt đối.

---

## 3. Mã màn hình Stitch và Mức độ trung thực thiết kế (Stitch Screen IDs & Source Fidelity)

Dự án Stitch: `13967597418813716400` ("Batdongsan")

| Màn hình | Stitch Screen ID | Route triển khai | Mức độ trung thực thiết kế | Ghi chú tài nguyên |
|---|---|---|---|---|
| **Login** | `172be7f0326346cc93a182fd06abc7d7` | `/login` | 100% | Bố cục 2 cột (Panel giá trị thương hiệu bên trái + Form đăng nhập bên phải), nút chuyển đổi ẩn/hiện mật khẩu, modal thông báo lộ trình Quên mật khẩu. |
| **Register** | `afd1e0bfcea14563ab2e8243a927318b` | `/register` | 100% | Bố cục 2 cột, 3 radio cards chọn mục đích sử dụng (`BUYER`, `OWNER`, `AGENT`), ô nhập số điện thoại hỗ trợ tư vấn, xác nhận mật khẩu, checkbox cam kết điều khoản. |

**Bảo tồn hệ thống thiết kế**:
- Màu sắc chủ đạo: Deep Teal (`#0F766E`), Deep Navy (`#142B4A`), Nền Slate-50 (`#F8FAFC`), Viền Slate-200 (`#E2E8F0`).
- Typography: Be Vietnam Pro (`next/font/google`).
- Iconography: Google Material Symbols Outlined.
- Border radius: Bo góc 8px/12px đồng bộ.
- Thiết kế thích ứng (Responsive): Hiển thị tối ưu từ mobile (cột đơn) đến desktop (cột đôi split-layout).

---

## 4. Kiến trúc Frontend đã triển khai (Frontend Architecture)

Cấu trúc thư mục được tổ chức theo tiêu chuẩn Next.js 16 App Router:

```
frontend/src/
├── app/
│   ├── api/auth/                  # Next.js BFF Route Handlers
│   │   ├── login/route.ts         # Proxy POST login, gán HttpOnly cookie
│   │   ├── logout/route.ts        # POST logout, xóa HttpOnly cookie
│   │   ├── me/route.ts            # GET verify session từ cookie
│   │   └── register/route.ts      # Proxy POST register với whitelist DTO
│   ├── login/
│   │   └── page.tsx               # Màn hình Đăng nhập (Stitch 172be7f0...)
│   ├── register/
│   │   └── page.tsx               # Màn hình Đăng ký (Stitch afd1e0bf...)
│   ├── globals.css                # CSS variables token, Material Symbols, Tailwind
│   ├── layout.tsx                 # Root layout tích hợp AuthProvider & Font
│   └── page.tsx                   # Trang chủ minh họa tích hợp Navbar & Footer
├── components/
│   └── common/
│       ├── Footer.tsx             # Footer dùng chung chuẩn thiết kế Stitch
│       └── Navbar.tsx             # Thanh điều hướng Role-aware chuẩn Stitch
├── context/
│   └── AuthContext.tsx            # Context quản trị phiên xác thực & hydration
├── lib/
│   ├── api-client.ts              # API Client tập trung xử lý fetch & error handling
│   └── server-config.ts           # Cấu hình an toàn chỉ đọc trên server Next.js
├── types/
│   └── index.ts                   # Hợp đồng TypeScript đồng bộ NestJS DTOs/Enums
└── __tests__/                     # Bộ kiểm thử đơn vị và tích hợp (Vitest)
    ├── api-client.test.ts
    ├── AuthContext.test.tsx
    ├── LoginPage.test.tsx
    ├── Navbar.test.tsx
    └── RegisterPage.test.tsx
```

---

## 5. Thiết kế API Client tập trung (Centralized API Client Design)

Tệp: `frontend/src/lib/api-client.ts`

- **Trách nhiệm**: Đóng gói toàn bộ logic gọi mạng thông qua fetch chuẩn, tích hợp sẵn timeout (mặc định 15s) bằng `AbortController`.
- **Phân lớp Lỗi (ApiClientError)**:
  - Trích xuất mã trạng thái HTTP (`statusCode`).
  - Chuẩn hóa thông điệp lỗi: hỗ trợ cả chuỗi đơn và mảng chuỗi từ NestJS `class-validator`.
  - Phân loại rõ ràng:
    - `HTTP 400`: Lỗi kiểm tra dữ liệu đầu vào (Validation Error).
    - `HTTP 401`: Phiên đăng nhập hết hạn hoặc thông tin đăng nhập không chính xác.
    - `HTTP 403`: Không có quyền truy cập tài nguyên.
    - `HTTP 404`: Không tìm thấy tài nguyên.
    - `HTTP 408`: Timeout quá thời gian chờ mạng.
    - `HTTP 409`: Xung đột nghiệp vụ / Email đã đăng ký / Xung đột dữ liệu đồng thời.
    - `HTTP 500`: Lỗi kết nối hoặc sự cố máy chủ nội bộ.
    - `HTTP 204`: Xử lý thành công không có nội dung trả về (`No Content`).
- **An toàn kiểu dữ liệu**: Sử dụng Generic TypeScript và kiểm tra type narrowing nghiêm ngặt (`unknown`), loại bỏ hoàn toàn việc sử dụng kiểu `any`.

---

## 6. Thiết kế Bảo mật JWT & Quản trị Phiên làm việc (JWT/Session Security Design)

Triển khai mô hình **BFF (Backend-for-Frontend)** với các thuộc tính bảo mật:
1. **Lưu trữ phiên an toàn**:
   - Tên cookie: `batdongsan_session`.
   - Thuộc tính cookie: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 ngày`, `secure: true` khi chạy ở môi trường production HTTPS.
2. **Ngăn chặn XSS & rò rỉ Token**:
   - Tuyệt đối KHÔNG lưu trữ JWT vào `localStorage` hay `sessionStorage`.
   - Phản hồi JSON trả về từ route `/api/auth/login` chỉ chứa thông tin đối tượng `{ user }`, không bao giờ để lộ chuỗi raw JWT cho JavaScript ở trình duyệt.
3. **Ủy quyền Server-to-Server**:
   - Khi cần gọi xác thực thông tin người dùng (`/api/auth/me`), route handler của Next.js đọc cookie từ phía server, đính kèm header `Authorization: Bearer <token>` và gọi trực tiếp tới NestJS Backend (`http://localhost:3000`).
   - Nếu Backend trả về `HTTP 401 Unauthorized` (do token hết hạn hoặc không hợp lệ), Route Handler tự động thực thi lệnh xóa cookie trên trình duyệt.
4. **Bảo vệ Upstream cố định**:
   - Server base URL được cấu hình cố định thông qua biến môi trường bí mật `NESTJS_INTERNAL_URL` hoặc mặc định an toàn `http://localhost:3000`. Không cho phép client chỉ định host tùy tiện.

---

## 7. Chu trình Vòng đời AuthContext (AuthContext & Session Lifecycle)

Tệp: `frontend/src/context/AuthContext.tsx`

- **Hợp đồng Context**:
  - `user: User | null` — Thông tin người dùng hiện tại (id, email, fullName, role, ...).
  - `isAuthenticated: boolean` — Trạng thái đăng nhập đã được xác thực.
  - `isLoading: boolean` — Cờ báo đang kiểm tra phiên làm việc ban đầu.
  - `login(credentials)` — Hàm đăng nhập, cập nhật state người dùng.
  - `register(data)` — Hàm đăng ký tài khoản mới.
  - `logout()` — Hàm đăng xuất, gọi route xóa cookie và reset state về null.
  - `refreshUser()` — Hàm chủ động đồng bộ lại thông tin người dùng từ Backend.
- **Tối ưu hóa Vòng đời (Lifecycle) theo React 19**:
  - Tự động hydration thông qua `initAuth()` bên trong `useEffect` với cờ `isMounted` để ngăn chặn rò rỉ bộ nhớ khi unmount.
  - Tránh triệt để lỗi `react-hooks/set-state-in-effect`, không gây ra hiện tượng giật màn hình (flicker) hay render xếp tầng (cascading render).

---

## 8. Triển khai Màn hình Đăng nhập (Login Page Implementation)

Tệp: `frontend/src/app/login/page.tsx` (Route: `/login`)

- **Bám sát thiết kế Stitch**:
  - Khung chia đôi chuẩn desktop: Cột trái hiển thị banner minh họa cùng các ưu điểm nổi bật của nền tảng (MLS nội bộ, dữ liệu xác thực, bảo mật). Cột phải là form tương tác tinh tế.
- **Tính năng & Trải nghiệm UX**:
  - Ô nhập email chuẩn `type="email"`, tự động `autoComplete="email"`.
  - Ô nhập mật khẩu hỗ trợ nút ẩn/hiện mật khẩu trực quan.
  - Checkbox "Ghi nhớ phiên đăng nhập".
  - Nút bấm trạng thái đang xử lý (`isLoading`) tự động vô hiệu hóa để chống double-click.
  - Hiển thị thông báo lỗi rõ ràng bằng tiếng Việt chuẩn ngữ cảnh khi có lỗi (sai mật khẩu 401, lỗi mạng, v.v.).
  - Xử lý link "Quên mật khẩu?": Do Backend chưa có API (GAP-03), hệ thống hiển thị Modal thông báo minh bạch giải thích rõ đây là tính năng đang trong lộ trình phát triển, không tạo đường dẫn chết (dead link).
  - Sau khi đăng nhập thành công, tự động điều hướng người dùng về trang chủ `/`.

---

## 9. Triển khai Màn hình Đăng ký (Register Page Implementation)

Tệp: `frontend/src/app/register/page.tsx` (Route: `/register`)

- **Bám sát thiết kế Stitch**:
  - Giao diện hai cột sang trọng, chuyên nghiệp.
  - Cung cấp 3 thẻ chọn mục đích sử dụng (Radio Cards):
    1. *Tìm mua hoặc thuê* (`BUYER`)
    2. *Đăng tin bất động sản* (`OWNER`)
    3. *Hoạt động môi giới* (`AGENT`)
- **Tuân thủ chặt chẽ Quy tắc Nghiệp vụ Phân quyền (Role vs RegistrationIntent)**:
  - Lựa chọn mục đích chỉ được map vào trường `registrationIntent`.
  - Mọi tài khoản mới đăng ký đều do NestJS gán vai trò thực tế là `BUYER`. Người dùng không thể tự cấp quyền `AGENT` hoặc `ADMIN`.
- **Whitelist DTO nghiêm ngặt**:
  - Backend NestJS áp dụng `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
  - Frontend chỉ gửi đúng 4 trường được phép: `{ email, password, fullName, registrationIntent }`. Các trường hỗ trợ giao diện như `phone` và `confirmPassword` được kiểm tra ở frontend và không bao giờ gửi thừa lên backend, tránh bị lỗi HTTP 400.
- **Xử lý phản hồi**:
  - Khi đăng ký thành công (HTTP 201), hiển thị thông báo chúc mừng và chuyển hướng người dùng sang trang `/login` sau 1.5 giây.
  - Xử lý mượt mà lỗi trùng lặp email (HTTP 409 Conflict) với thông báo tiếng Việt trực quan.

---

## 10. Thanh điều hướng Nhận biết Vai trò (Role-aware Shared Navbar)

Tệp: `frontend/src/components/common/Navbar.tsx`

- **Trạng thái Khách vãng lai (Visitor)**:
  - Menu: "Mua bán", "Cho thuê", "Dự án".
  - Hành động: Nút "Đăng nhập" (dẫn đến `/login`) và "Đăng ký" (dẫn đến `/register`).
- **Trạng thái Người dùng đã Đăng nhập (Authenticated)**:
  - Huy hiệu vai trò nổi bật:
    - `BUYER`: Badge màu xanh dương "Khách hàng".
    - `OWNER`: Badge màu lục "Chính chủ".
    - `AGENT`: Badge màu lam Teal "Môi giới".
    - `ADMIN`: Badge màu đỏ "Quản trị viên".
  - Hiển thị tên người dùng và avatar ký tự viết tắt.
  - Nút "Đăng xuất" gọi API session logout và khôi phục trạng thái khách vãng lai.
  - Chỉ hiển thị các route đã tồn tại, tránh điều hướng đến dashboard chưa phát triển.
- **Hỗ trợ Thiết bị Di động**: Menu trượt responsive đầy đủ chức năng.

---

## 11. Đối chiếu Hợp đồng Backend (Actual Backend Contract Mapping)

| Endpoint Backend | HTTP Method | Payload gửi đi | Định dạng phản hồi thực tế | Xử lý tại Frontend BFF |
|---|---|---|---|---|
| `/api/auth/register` | `POST` | `{ email, password, fullName, registrationIntent? }` | `{ id, email, fullName, role, registrationIntent, createdAt }` | Route handler Next.js lọc whitelist payload và chuyển tiếp nguyên vẹn phản hồi. |
| `/api/auth/login` | `POST` | `{ email, password }` | `{ accessToken, user: { id, email, fullName, role } }` | Route handler gán HttpOnly cookie lưu `accessToken`, trả về client chỉ `{ user }`. |
| `/api/auth/me` | `GET` | Header `Authorization: Bearer <token>` | `{ id, email, fullName, phone, role, isActive, ... }` | Route handler đọc cookie, đính kèm Bearer token, trả về client `{ user }`. |

---

## 12. Danh mục Tính năng Tạm hoãn (Deferred Backend Gaps)

Theo đúng Báo cáo Đánh giá Sẵn sàng Phase 2E-0, 5 khoảng trống tính năng của Backend sau đây được ghi nhận rõ ràng và hoãn lại cho các giai đoạn chuyên biệt sau:
1. **GAP-01**: API kiểm duyệt tin đăng chờ duyệt dành cho Quản trị viên (`pending-moderation`).
2. **GAP-02**: Các API quản lý tin đăng đã lưu (Saved Listings CRUD).
3. **GAP-03**: API khôi phục / Quên mật khẩu (`POST /api/auth/forgot-password`). Đã tích hợp Modal giải thích rõ ràng tại màn hình Login.
4. **GAP-04**: API cập nhật hồ sơ cá nhân và đổi mật khẩu người dùng.
5. **GAP-05**: API tải lên hình ảnh tin đăng dạng multipart/form-data.

---

## 13. Độ bao phủ Kiểm thử và Kết quả Thực tế (Test Coverage & Results)

Hệ thống kiểm thử Frontend được xây dựng mới hoàn toàn sử dụng **Vitest** kết hợp với **React Testing Library** và môi trường **jsdom**, tương thích tối ưu với Next.js 16.

### Kết quả chạy kiểm thử Frontend (`npm test` tại `frontend`):

```text
 RUN  v4.1.12 D:/Batdongsan/frontend

 ✓ src/__tests__/api-client.test.ts (8 tests)
     ✓ 1. Successful JSON response: parses and returns typed data
     ✓ 2. HTTP 400 Validation Error: normalizes error array into ApiClientError
     ✓ 3. HTTP 401 Unauthenticated: throws with 401 statusCode
     ✓ 4. HTTP 403 Forbidden: throws with 403 statusCode
     ✓ 5. HTTP 404 Not Found: throws with 404 statusCode
     ✓ 6. HTTP 409 Conflict: throws with 409 statusCode and conflict message
     ✓ 7. Network Failure / Abort: normalizes to ApiClientError with 500 / 408
     ✓ 8. HTTP 204 No Content: resolves empty object without error
 ✓ src/__tests__/AuthContext.test.tsx (4 tests)
     ✓ 1. Initial hydration: fetches /api/auth/me and updates state
     ✓ 2. Unauthenticated session: user remains null when /api/auth/me returns 401
     ✓ 3. Login flow: updates user state upon successful login
     ✓ 4. Logout flow: calls api logout and resets user to null
 ✓ src/__tests__/Navbar.test.tsx (6 tests)
     ✓ 1. Visitor state: renders login and register buttons
     ✓ 2. Authenticated BUYER state: renders user name, BUYER badge and logout button
     ✓ 3. Authenticated OWNER state: renders OWNER badge
     ✓ 4. Authenticated AGENT state: renders AGENT badge
     ✓ 5. Authenticated ADMIN state: renders ADMIN badge
     ✓ 6. Logout button click: triggers logout from AuthContext
 ✓ src/__tests__/LoginPage.test.tsx (5 tests)
     ✓ 1. Form rendering: renders email, password inputs, submit button, and links
     ✓ 2. Password visibility toggle works
     ✓ 3. Successful login calls login() and redirects to home page
     ✓ 4. Invalid credentials shows clear Vietnamese error message
     ✓ 5. Forgot password modal: opens and clearly explains GAP-03 deferred notice
 ✓ src/__tests__/RegisterPage.test.tsx (5 tests)
     ✓ 1. Form rendering: renders all required inputs and role options
     ✓ 2. Client-side validation: password length under 8 characters shows error
     ✓ 3. Client-side validation: password mismatch shows error
     ✓ 4. Successful registration: calls register() with whitelisted fields and redirects
     ✓ 5. Email already registered (HTTP 409): displays clear conflict error

 Test Files  5 passed (5)
      Tests  28 passed (28)
   Duration  8.88s
```

### Kết quả kiểm tra Không hồi quy Backend (`npm test` tại `backend`):

```text
 RUN  v4.1.12 D:/Batdongsan/backend

 ✓ src/mls/mls.spec.ts (39 tests)
 ✓ src/app.controller.spec.ts (1 test)
 ✓ src/contact-requests/contact-requests.spec.ts (48 tests)
 ✓ src/listings/listings.spec.ts (28 tests)
 ✓ src/auth/auth.spec.ts (16 tests)

 Test Files  5 passed (5)
      Tests  132 passed (132)
   Duration  17.52s
```

Toàn bộ 132/132 unit tests của Backend tiếp tục vượt qua 100%.

---

## 14. Kết quả Lint và Build (Lint & Build Results)

### 1. `npm run lint` (Frontend)
- Lệnh: `eslint`
- Kết quả: **0 errors, 0 warnings** (Exit code 0).

### 2. `npm run build` (Frontend)
- Lệnh: `next build` (Next.js 16.4.2 Turbopack)
- Kết quả: **Thành công 100% (Exit code 0)**.
- Bảng danh mục Routes được biên dịch:
  - `○ /` (Static - Trang chủ)
  - `○ /_not-found` (Static - 404 Page)
  - `ƒ /api/auth/login` (Dynamic - BFF Route Handler)
  - `ƒ /api/auth/logout` (Dynamic - BFF Route Handler)
  - `ƒ /api/auth/me` (Dynamic - BFF Route Handler)
  - `ƒ /api/auth/register` (Dynamic - BFF Route Handler)
  - `○ /login` (Static - Trang Đăng nhập)
  - `○ /register` (Static - Trang Đăng ký)

---

## 15. Kiểm tra Tương thích Desktop & Mobile (Desktop/Mobile Verification)

1. **Desktop Viewport (1024px trở lên)**:
   - Hai màn hình Login và Register áp dụng grid 12 cột cân đối: 5 cột bên trái dành cho Brand Showcase Panel (hình ảnh kiến trúc, badge an tâm, điểm nổi bật dịch vụ); 7 cột bên phải dành cho Form tương tác.
   - Khoảng cách padding, tỉ lệ ô nhập và typography giữ đúng nguyên mẫu Stitch.
2. **Tablet & Mobile Viewport (dưới 1024px)**:
   - Layout tự động chuyển dịch linh hoạt sang cột đơn.
   - Hình ảnh và panel giới thiệu tự điều chỉnh tỷ lệ mượt mà, đảm bảo khả năng chạm nhấn (tap targets) trên màn hình cảm ứng tối thiểu 44x44px.
   - Navbar thu gọn vào menu trượt với nút đóng mở trực quan.

---

## 16. Danh sách Tệp Thay đổi (Exact Files Changed)

### Tệp chỉnh sửa (Modified):
- `frontend/package.json`: Bổ sung scripts kiểm thử và devDependencies (`vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom`, `@vitejs/plugin-react`).
- `frontend/package-lock.json`: Cập nhật khóa gói phụ thuộc.
- `frontend/src/app/globals.css`: Import font Material Symbols Outlined và khai báo token CSS màu sắc.
- `frontend/src/app/layout.tsx`: Bọc ứng dụng trong `AuthProvider`, cấu hình font chữ Be Vietnam Pro.
- `frontend/src/app/page.tsx`: Cập nhật trang chủ đón nhận Navbar nhận biết vai trò và Footer chuẩn hóa.

### Tệp tạo mới (Added):
- `frontend/src/app/api/auth/login/route.ts`: BFF Route Handler đăng nhập & set HttpOnly cookie.
- `frontend/src/app/api/auth/logout/route.ts`: BFF Route Handler đăng xuất & xóa cookie.
- `frontend/src/app/api/auth/me/route.ts`: BFF Route Handler kiểm tra phiên Bearer token.
- `frontend/src/app/api/auth/register/route.ts`: BFF Route Handler đăng ký & whitelist DTO.
- `frontend/src/app/login/page.tsx`: Giao diện trang Đăng nhập theo thiết kế Stitch `172be7f0...`.
- `frontend/src/app/register/page.tsx`: Giao diện trang Đăng ký theo thiết kế Stitch `afd1e0bf...`.
- `frontend/src/components/common/Navbar.tsx`: Navbar dùng chung nhận biết vai trò người dùng.
- `frontend/src/components/common/Footer.tsx`: Footer dùng chung theo phong cách Batdongsan.
- `frontend/src/context/AuthContext.tsx`: React Context quản lý phiên đăng nhập và hydration.
- `frontend/src/lib/api-client.ts`: Module gọi API tập trung và phân loại lỗi.
- `frontend/src/lib/server-config.ts`: Module đọc cấu hình phía server cho BFF.
- `frontend/src/types/index.ts`: Định nghĩa TypeScript types đồng bộ với NestJS.
- `frontend/vitest.config.ts`: Cấu hình chạy kiểm thử Vitest với jsdom và alias path `@/*`.
- `frontend/vitest.setup.ts`: Setup môi trường kiểm thử React Testing Library.
- `frontend/src/__tests__/api-client.test.ts`: Bộ kiểm thử đơn vị cho API Client (8 tests).
- `frontend/src/__tests__/AuthContext.test.tsx`: Bộ kiểm thử cho AuthContext (4 tests).
- `frontend/src/__tests__/Navbar.test.tsx`: Bộ kiểm thử hiển thị Navbar theo từng vai trò (6 tests).
- `frontend/src/__tests__/LoginPage.test.tsx`: Bộ kiểm thử tương tác và validation trang Login (5 tests).
- `frontend/src/__tests__/RegisterPage.test.tsx`: Bộ kiểm thử tương tác và whitelist trang Register (5 tests).

---

## 17. Rủi ro còn lại và Rào cản (Remaining Risks & Blockers)

- **Không có rào cản kỹ thuật nào (Zero Blockers)** đối với phạm vi Phase 2E-1.
- **Lưu ý nghiệp vụ**:
  - Tính năng Quên mật khẩu (GAP-03) hiện đang được thông báo minh bạch bằng Modal giao diện và cần được bổ sung ở giai đoạn backend gap remediation tương ứng trước khi đưa vào sản xuất thực tế.
  - Sau khi đăng nhập, hệ thống điều hướng về Trang chủ `/`. Các dashboard chuyên biệt theo vai trò (`/admin`, `/mls`, v.v.) sẽ được phát triển tuần tự trong các pha tiếp theo theo đúng lộ trình tích hợp gia tăng.

---

## 18. Trạng thái Git (Git Status)

```text
## feat/phase2e1-frontend-auth
 M frontend/package-lock.json
 M frontend/package.json
 M frontend/src/app/globals.css
 M frontend/src/app/layout.tsx
 M frontend/src/app/page.tsx
?? backend/check-db-fingerprint.mjs
?? docs/reports/PHASE2E_FRONTEND_INTEGRATION_READINESS_2026-11-01.md
?? docs/reports/PHASE2E1_FRONTEND_AUTH_IMPLEMENTATION_2026-11-02.md
?? frontend/src/__tests__/
?? frontend/src/app/api/
?? frontend/src/app/login/
?? frontend/src/app/register/
?? frontend/src/components/
?? frontend/src/context/
?? frontend/src/lib/
?? frontend/src/types/
?? frontend/vitest.config.ts
?? frontend/vitest.setup.ts
?? phase2d2-review.patch
```

- Không có commit mới nào được tạo.
- Không có thao tác git push nào được thực hiện.
- Tất cả các tệp nhạy cảm và tệp tiền nhiệm của người dùng đều được bảo vệ.

---

## 19. Khuyến nghị Nghiệm thu Cuối cùng (Final Acceptance Recommendation)

**READY FOR USER ACCEPTANCE**
