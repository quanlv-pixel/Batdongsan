# HƯỚNG DẪN DÀNH CHO NHÀ PHÁT TRIỂN — PHASE 2E-4: ADMIN & MODERATION PORTAL
## Tích Hợp Cổng Quản Trị Hệ Thống, Kiểm Duyệt Tin Đăng & Điều Phối Yêu Cầu (Next.js 16 & NestJS)

Tài liệu này cung cấp hướng dẫn kỹ thuật toàn diện về kiến trúc, cơ chế kiểm soát truy cập phân quyền (RBAC), tích hợp lớp trung gian Next.js BFF (Backend-for-Frontend), các hợp đồng API nội bộ và quy trình kiểm thử cho phân hệ **Admin & Moderation Portal** (Phase 2E-4) của nền tảng Batdongsan.

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN QUYỀN

Phân hệ Admin Portal được thiết kế theo mô hình **Next.js 16 App Router BFF** kết hợp với REST API của NestJS. Cổng quản trị được định tuyến đa ngôn ngữ và bảo vệ nghiêm ngặt:
- Đường dẫn chính quy: `/[locale]/admin` (ví dụ: `/vi/admin`, `/en/admin`).
- Đường dẫn tương thích (alias tiếng Việt): `/[locale]/quan-tri` (tự động chuyển hướng đồng bộ về `/[locale]/admin`, bảo toàn các tham số query như `?tab=...`).

### 1.1 Ma trận kiểm soát truy cập (Access Control Matrix)

| Trạng thái người dùng | Vai trò (Role) | Hành vi điều hướng & Phản hồi UI | Quyền gọi privileged API |
| :--- | :---: | :--- | :---: |
| **Chưa xác thực** | Không có | Chuyển hướng lập tức về `/[locale]/login?returnTo=...` | ❌ Bị chặn |
| **Đã xác thực** | `BUYER` | Hiển thị màn hình 403 Từ chối truy cập (`admin-access-denied`) | ❌ Bị chặn |
| **Đã xác thực** | `OWNER` | Hiển thị màn hình 403 Từ chối truy cập (`admin-access-denied`) | ❌ Bị chặn |
| **Đã xác thực** | `AGENT` | Hiển thị màn hình 403 Từ chối truy cập (`admin-access-denied`) | ❌ Bị chặn |
| **Đã xác thực** | `ADMIN` | Toàn quyền truy cập 4 tab quản trị & các API đặc quyền | ✅ Cho phép |

> **Bảo mật tuyệt đối phía Client & BFF:**
> Khi người dùng mang vai trò không phải `ADMIN` (như `BUYER`, `OWNER`, `AGENT`), `AdminPageClient` lập tức kết xuất giao diện từ chối truy cập `admin-access-denied` mà **hoàn toàn không kích hoạt bất kỳ lệnh gọi API đặc quyền nào** tới backend hoặc BFF.

---

## 2. BẢO MẬT PHIÊN LÀM VIỆC & NEXT.JS BFF (COOKIE FORWARDING)

Hệ thống tuân thủ chặt chẽ nguyên tắc bảo mật phiên làm việc:
1. **Không rò rỉ mã JWT ra JavaScript trình duyệt:** Phiên làm việc được quản lý qua cookie HttpOnly `batdongsan_session` (`HttpOnly; SameSite=Lax; Path=/`). Trình duyệt không thể đọc mã token qua `document.cookie`.
2. **Chuyển tiếp xác thực tại Server Next.js BFF:** Khi các tab UI tại trình duyệt gọi các route handler nội bộ tại `/api/admin/...`, Next.js đọc cookie từ `cookies()` và đính kèm vào tiêu đề `Authorization: Bearer <token>` để chuyển tiếp sang NestJS backend (cổng 3001).
3. **Che giấu lỗi máy chủ (Error Masking):** Toàn bộ các route handler BFF đều bọc trong khối `try/catch`. Trong trường hợp backend gặp sự cố hoặc trả về mã lỗi 500, BFF luôn trả về thông điệp an toàn chuẩn hóa mà không tiết lộ stack trace hay cấu trúc database.

### 2.1 Bảng danh mục Route Handlers BFF tại Next.js

| Phương thức | Đường dẫn Next.js BFF | Chức năng nghiệp vụ | Ánh xạ Backend NestJS |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/listings` | Lấy danh sách tin kiểm duyệt theo bộ lọc | `GET /api/listings/admin` |
| `POST` | `/api/admin/listings/[id]/moderate` | Phê duyệt hoặc từ chối kiểm duyệt tin | `POST /api/listings/:id/moderate` |
| `GET` | `/api/admin/listings/[id]/history` | Lấy lịch sử các lần kiểm duyệt của tin | `GET /api/listings/:id/moderation-history` |
| `GET` | `/api/admin/requests` | Lấy danh sách yêu cầu tư vấn toàn sàn | `GET /api/contact-requests` |
| `POST` | `/api/admin/requests/[id]/assign` | Phân công môi giới lần đầu cho lead | `POST /api/contact-requests/:id/assign` |
| `POST` | `/api/admin/requests/[id]/reassign` | Phân công lại môi giới kèm lý do | `POST /api/contact-requests/:id/reassign` |
| `POST` | `/api/admin/requests/[id]/reopen` | Mở lại yêu cầu ở trạng thái cuối kèm lý do | `POST /api/contact-requests/:id/reopen` |
| `GET` | `/api/admin/requests/[id]/assignments`| Lấy lịch sử điều phối của yêu cầu | `GET /api/contact-requests/:id/assignments` |
| `GET` | `/api/admin/users` | Lấy danh sách người dùng phân trang | `GET /api/admin/users` |
| `PATCH`| `/api/admin/users/[id]/role` | Cập nhật vai trò (Role) người dùng | `PATCH /api/admin/users/:id/role` |
| `PATCH`| `/api/admin/users/[id]/status` | Bật/tắt kích hoạt trạng thái tài khoản | `PATCH /api/admin/users/:id/status` |
| `GET` | `/api/admin/agents` | Lấy danh sách môi giới đang hoạt động | `GET /api/admin/agents` |
| `GET` | `/api/admin/mls` | Lấy danh sách chia sẻ MLS trên toàn hệ thống | `GET /api/mls/admin/shares` |
| `POST` | `/api/admin/mls/[id]/revoke` | Thu hồi quyền chia sẻ MLS của tin đăng | `POST /api/mls/shares/:id/revoke` |

---

## 3. CÁC PHÂN HỆ NGHIỆP VỤ QUẢN TRỊ (4 OPERATIONAL TABS)

Giao diện Admin Portal được tổ chức thành 4 tab chức năng, tự động đồng bộ trạng thái với URL query parameter `?tab=<key>`:

### 3.1 Tab 1: Kiểm duyệt Tin đăng (`ModerationTab` — `?tab=moderation`)
- **Hàng đợi kiểm duyệt (Queue):** Mặc định lọc theo trạng thái `PENDING` (Chờ duyệt). Hỗ trợ chuyển đổi nhanh giữa các bộ lọc: `TẤT CẢ`, `CHỜ DUYỆT`, `ĐÃ PHÊ DUYỆT`, `BỊ TỪ CHỐI`, `BẢN NHÁP`.
- **Thao tác Phê duyệt (`APPROVED`):** Nhấn nút Phê duyệt trên thẻ tin đăng để chuyển trạng thái sang `APPROVED`, tin lập tức xuất hiện công khai trên trang tìm kiếm và chi tiết.
- **Thao tác Từ chối (`REJECTED`):** Mở modal từ chối kiểm duyệt. **Bắt buộc nhập lý do từ chối không để trống** (kiểm tra trim chuỗi tại cả client và backend).
- **Lịch sử kiểm duyệt:** Modal hiển thị nhật ký các lần duyệt của tin đăng (`moderationLogs`), bao gồm trạng thái chuyển đổi, tên quản trị viên, lý do và thời gian thực hiện.

### 3.2 Tab 2: Điều phối & Giám sát Yêu cầu Tư vấn (`AdminRequestsTab` — `?tab=requests`)
- **Theo dõi toàn sàn:** Hiển thị toàn bộ các yêu cầu liên hệ từ khách mua trên toàn hệ thống, hỗ trợ lọc theo trạng thái (`ALL`, `NEW`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`) và bộ lọc `Chưa phân công` (unassigned).
- **Phân công lần đầu (`First Assign`):** Cho phép gán trực tiếp một môi giới từ danh sách môi giới đang hoạt động (`GET /api/admin/agents`).
- **Phân công lại (`Reassign`):** Cho phép đổi môi giới phụ trách lead kèm theo **bắt buộc nhập lý do tái điều phối**.
- **Mở lại yêu cầu (`Reopen`):** Đối với các yêu cầu đã ở trạng thái kết thúc (`COMPLETED` hoặc `REJECTED`), Admin có thể mở lại chuyển về `IN_PROGRESS` kèm **bắt buộc nhập lý do mở lại**.
- **Nhật ký điều phối:** Drawer/Modal hiển thị chi tiết lịch sử phân công (`assignments`), bao gồm thời điểm bàn giao, môi giới cũ/mới và lý do điều phối.

### 3.3 Tab 3: Quản lý Người dùng & Phân quyền (`UsersManagementTab` — `?tab=users`)
- **Danh sách người dùng:** Hiển thị bảng tài khoản với các trường: `fullName`, `email`, `phone`, `registrationIntent`, `role`, `isActive`, `createdAt`.
- **Cảnh báo không khớp ý định đăng ký (`intent-discrepancy-${id}`):** Tự động phát hiện trường hợp `registrationIntent` (ý định đăng ký ban đầu như `OWNER` hoặc `AGENT`) khác với `role` thực tế hiện tại, gắn nhãn trực quan màu hổ phách để quản trị viên dễ dàng rà soát và nâng cấp quyền.
- **Cập nhật vai trò (Role Assignment):** Modal cho phép Admin nâng/hạ vai trò (`BUYER`, `OWNER`, `AGENT`, `ADMIN`) kèm ghi log kiểm toán (`AuditLog`).
- **Khóa/Mở khóa tài khoản (`isActive` Toggle):** Bật/tắt trạng thái hoạt động của người dùng ngay trên giao diện.
- **Rào chắn bảo vệ bản thân (Self-Action Guard):**
  - Quản trị viên hiện tại **không thể tự hạ quyền của chính mình** (`isSelf` -> vô hiệu hóa nút đổi role).
  - Quản trị viên hiện tại **không thể tự khóa tài khoản của chính mình** (`isSelf` -> vô hiệu hóa switch khóa tài khoản).
  - Backend NestJS cũng kiểm tra độc lập và ném lỗi `BadRequestException('Admin cannot demote/deactivate their own account')` nếu có yêu cầu tự thao tác.

### 3.4 Tab 4: Giám sát Mạng lưới MLS (`AdminMlsTab` — `?tab=mls`)
- **Quản lý chia sẻ chéo:** Hiển thị danh sách toàn bộ các lượt chia sẻ nguồn hàng nội bộ giữa các môi giới trên toàn sàn.
- **Huy hiệu phân quyền trực quan:**
  - `Quyền Xem (VIEW)`: Quyền cơ bản, địa chỉ chi tiết được ẩn bảo mật.
  - `Đồng quản lý (MANAGE)`: Quyền quản lý dẫn khách xem bất động sản.
- **Thu hồi quyền chia sẻ (`Revoke Share`):** Admin có thể thu hồi bất kỳ lượt chia sẻ MLS đang hoạt động nào kèm lý do thu hồi tùy chọn.

---

## 4. CHI TIẾT CÁC THỰC THI BACKEND NESTJS

### 4.1 Module Người dùng mới (`backend/src/users/`)
- `users.module.ts`: Khai báo `UsersModule`, import `PrismaModule` và `AuthModule` (cung cấp `JwtAuthGuard` và `RolesGuard`).
- `users.controller.ts`: Đặt tiền tố `@Controller('admin')`, gắn `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(Role.ADMIN)`:
  - `GET /api/admin/users`: Lấy danh sách người dùng kèm phân trang `page`, `limit`, tìm kiếm `search` và bộ lọc `role`, `isActive`. Loại trừ trường `passwordHash`.
  - `GET /api/admin/agents`: Lấy danh sách nhanh các môi giới có `role: 'AGENT'` và `isActive: true`.
  - `PATCH /api/admin/users/:id/role`: Cập nhật vai trò kèm kiểm tra self-demotion. Ghi `AuditLog` với action `ADMIN_USER_ROLE_UPDATED`.
  - `PATCH /api/admin/users/:id/status`: Bật/tắt trạng thái tài khoản kèm kiểm tra self-deactivation. Ghi `AuditLog` với action `ADMIN_USER_STATUS_UPDATED`.
- `users.service.ts`: Chứa toàn bộ logic truy vấn Prisma an toàn, xử lý transaction và ghi nhận log kiểm toán.

### 4.2 Mở rộng `ListingsModule` & `MlsModule`
- `listings.controller.ts`: Bổ sung `GET /api/listings/admin` với `@Roles(Role.ADMIN)`. Đặt trước route `GET /:id` để tránh bị nuốt route (route shadowing).
- `mls.controller.ts`: Bổ sung `GET /api/mls/admin/shares` với `@Roles(Role.ADMIN)`. Trả về toàn bộ bản ghi chia sẻ MLS kèm quan hệ `listing`, `grantor`, `grantee`.

---

## 5. QUY TRÌNH KIỂM THỬ & XÁC MINH HỆ THỐNG

### 5.1 Kiểm thử tự động (Automated Tests)
Hệ thống tích hợp bộ kiểm thử đơn vị và tích hợp phong phú:
```bash
# Chạy toàn bộ 204 bài test Frontend
npm --prefix frontend test -- --run

# Chạy toàn bộ 148 bài test Backend
npm --prefix backend test
```

- **Kết quả Frontend:** 19/19 test suites vượt qua, 204/204 tests passed:
  - `admin-portal.test.tsx`: 11 bài test bao phủ điều hướng khách vãng lai, chặn 403 non-admin, render 4 tab, mở modal từ chối, kiểm tra self-guard.
  - `bff-admin-routes.test.ts`: 16 bài test bao phủ đầy đủ 14 route handler BFF (chuyển tiếp cookie, xác thực payload, xử lý lỗi).
  - `Navbar.test.tsx`: 9 bài test (bao gồm kiểm tra hiển thị liên kết "Quản trị" cho vai trò `ADMIN`).
- **Kết quả Backend:** 6/6 test suites vượt qua, 148/148 tests passed:
  - `users.spec.ts`: 11 bài test kiểm tra phân trang, bảo vệ self-demotion, self-deactivation và ghi AuditLog.
  - `listings.spec.ts`: Bổ sung kiểm tra danh sách kiểm duyệt tin cho Admin.
  - `mls.spec.ts`: Bổ sung kiểm tra giám sát chia sẻ MLS toàn hệ thống.

### 5.2 Kiểm tra Chuẩn Code (Linting) & Production Build
```bash
# Frontend ESLint (Next.js 16 / React 19)
npm --prefix frontend run lint
# Kết quả: 0 errors, 0 warnings

# Backend Oxlint (NestJS / TypeScript)
npm --prefix backend run lint
# Kết quả: 0 errors, 0 warnings (53 files scanned)

# Backend NestJS Build
npm --prefix backend run build
# Kết quả: Thành công (Exit code 0)

# Frontend Next.js Production Build (Turbopack)
npm --prefix frontend run build
# Kết quả: 47/47 static and dynamic pages generated successfully (Exit code 0)
```

### 5.3 Bằng chứng kiểm thử trình duyệt thực tế (Chrome CDP)
Kiểm thử tự động trên Chrome thực tế qua Chrome DevTools Protocol (port 9236):
1. `01-unauthenticated-admin-redirect.png`: Khách vãng lai truy cập `/vi/admin` được chuyển hướng chuẩn xác về `/vi/login?returnTo=%2Fvi%2Fadmin`.
2. `02-buyer-access-denied.png`: Người dùng vai trò `BUYER` bị chặn với màn hình `admin-access-denied` (HTTP 403 status view), không có API nhạy cảm nào được gọi.
3. `03-admin-moderation-queue.png`: Tài khoản `ADMIN` truy cập thành công giao diện Cổng Quản Trị Hệ Thống với hàng đợi kiểm duyệt tin PENDING.
4. `04-admin-requests-dispatch.png`: Tab điều phối yêu cầu tư vấn hiển thị các nút Phân công, Điều phối lại, Mở lại và xem lịch sử.
5. `05-admin-user-management.png`: Tab quản lý người dùng hiển thị danh sách, nhãn `intent-discrepancy`, và các nút thao tác bản thân bị vô hiệu hóa an toàn.
6. `06-admin-mls-oversight.png`: Tab giám sát MLS hiển thị đầy đủ danh sách chia sẻ mạng lưới và nút thu hồi quyền.
7. `07-admin-mobile-responsive.png`: Giao diện di động (390x844) phản hồi hoàn hảo, không có hiện tượng tràn ngang màn hình.
