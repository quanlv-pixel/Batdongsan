# HƯỚNG DẪN DÀNH CHO NHÀ PHÁT TRIỂN — PHASE 2E-3: OWNER & AGENT WORKSPACES
## Tích Hợp Không Gian Quản Trị Cho Chủ Nhà & Môi Giới Bất Động Sản (Next.js 16 & NestJS)

Tài liệu này cung cấp hướng dẫn kỹ thuật toàn diện về kiến trúc, luồng phân quyền, tích hợp BFF, xử lý dữ liệu bảo mật và kiểm thử cho phân hệ **Owner & Agent Workspaces** (Phase 2E-3) của nền tảng Batdongsan.

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN QUYỀN

Phân hệ Workspaces được thiết kế theo mô hình **Next.js 16 App Router BFF (Backend-for-Frontend)** kết hợp cùng NestJS REST API cốt lõi. Bàn làm việc số được bảo vệ phân quyền theo vai trò (Role-Based Access Control - RBAC) tại URL đa ngữ:
- Đường dẫn chính: `/[locale]/quan-ly` (ví dụ: `/vi/quan-ly`, `/en/quan-ly`)
- Đường dẫn alias: `/[locale]/workspace` (tự động chuyển hướng đồng bộ về `/[locale]/quan-ly`, bảo toàn query parameters)

### 1.1 Ma trận phân quyền theo vai trò người dùng

| Vai trò (Role) | Truy cập Portal | Tab 1: Tin đăng (`my-listings`) | Tab 2: Khách hàng (`leads`) | Tab 3: Kho tin MLS (`mls`) | Tab 4: Yêu cầu tư vấn (`inquiries`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **BUYER** | ❌ Chặn truy cập | ❌ | ❌ | ❌ | ❌ |
| **OWNER** | ✅ Cho phép | ✅ Quản lý tin & nộp duyệt | ❌ Ẩn khỏi DOM | ❌ Ẩn khỏi DOM | ✅ Theo dõi tư vấn trên tin của mình |
| **AGENT** | ✅ Cho phép | ✅ Quản lý tin của Agent | ✅ Tiếp nhận & xử lý lead | ✅ Khai thác nguồn hàng MLS | ✅ Theo dõi tư vấn trên tin của mình |
| **ADMIN** | ✅ Toàn quyền | ✅ Quản lý & kiểm duyệt | ✅ Giám sát lead toàn sàn | ✅ Giám sát nguồn tin chia sẻ | ✅ Toàn quyền theo dõi yêu cầu tư vấn |

- Khi người dùng có vai trò `BUYER` truy cập vào `/quan-ly`, giao diện hiển thị thông báo thân thiện `buyer-access-notice` ("Khu vực dành cho Đối tác") và nút quay về trang chủ.
- Khi khách vãng lai (chưa đăng nhập) truy cập, hệ thống tự động lưu URL hiện tại vào tham số `returnTo` và chuyển hướng đến trang đăng nhập `/[locale]/login?returnTo=...`.

---

## 2. BẢO MẬT PHIÊN LÀM VIỆC & NEXT.JS BFF (COOKIE FORWARDING)

Theo tiêu chuẩn bảo mật của hệ thống:
1. **Không rò rỉ JWT ra JavaScript trình duyệt:** Mã xác thực JWT được lưu trữ độc quyền trong HttpOnly Cookie `batdongsan_session` với các cờ bảo vệ `HttpOnly`, `SameSite=Lax`, `Secure` (trong môi trường Production).
2. **Ủy quyền an toàn tại Server Next.js BFF:** Khi trình duyệt gọi các API route BFF tại `/api/...`, máy chủ Next.js đọc cookie từ `cookies()` và đính kèm vào tiêu đề `Authorization: Bearer <token>` để gọi tiếp vào NestJS backend (cổng 3001).

### 2.1 Bảng danh mục các Route Handlers BFF tại Next.js

| Phương thức | Đường dẫn Next.js BFF | Mục đích | Ánh xạ Backend NestJS |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/listings/mine` | Lấy danh sách tin đăng của người dùng hiện tại | `GET /api/listings/mine` |
| `GET` | `/api/listings/my-listings` | Alias route thuận tiện cho frontend | `GET /api/listings/mine` |
| `POST` | `/api/listings` | Tạo tin đăng mới (Draft) kèm xác thực đầu vào | `POST /api/listings` |
| `POST` | `/api/listings/[id]/submit` | Gửi tin đăng lên hàng đợi kiểm duyệt (Pending) | `POST /api/listings/:id/submit` |
| `GET` | `/api/contact-requests/assigned` | Lấy danh sách lead được phân công cho Agent | `GET /api/contact-requests/assigned` |
| `GET` | `/api/contact-requests/for-owned-listings`| Lấy danh sách yêu cầu tư vấn trên tin của Owner | `GET /api/contact-requests/for-owned-listings` |
| `PATCH`| `/api/contact-requests/[id]/status` | Cập nhật trạng thái xử lý khách hàng | `PATCH /api/contact-requests/:id/status` |
| `GET` | `/api/mls/shares/received` | Lấy danh sách tin chia sẻ MLS mà Agent nhận được | `GET /api/mls/shares/received` |
| `POST` | `/api/mls/shares` | Cấp quyền chia sẻ tin MLS cho Agent khác | `POST /api/mls/shares` |
| `POST` | `/api/mls/shares/[id]/revoke` | Thu hồi quyền chia sẻ tin MLS | `POST /api/mls/shares/:id/revoke` |

---

## 3. CÁC TÍNH NĂNG VẬN HÀNH TRỌNG TÂM

### 3.1 Quản lý Tin đăng & Nộp duyệt lại (`MyListingsTab`)
- Bộ lọc danh thái tin đăng: `Tất cả`, `Đang hiển thị (APPROVED)`, `Chờ duyệt (PENDING)`, `Bản nháp (DRAFT)`, `Bị từ chối (REJECTED)`.
- Hiển thị trực quan cảnh báo lý do từ chối kiểm duyệt (`moderation-rejection-alert`) kèm lịch sử kiểm duyệt từ `moderationLogs`.
- Cho phép chủ sở hữu bấm **Gửi duyệt lại** (`submitListing`) đối với các tin DRAFT hoặc REJECTED, cập nhật trạng thái lập tức sang PENDING.
- Tích hợp Modal tạo tin đăng mới (`CreateListingModal`) với đầy đủ trường kiểm tra tính hợp lệ: loại bất động sản, hình thức giao dịch, diện tích, giá và ảnh.

### 3.2 Xử lý Khách hàng Tiềm năng & Quyền Riêng Tư (`AssignedLeadsTab`)
- Tiếp nhận các yêu cầu tư vấn được hệ thống tự động phân phối cho Agent.
- **Tuân thủ quyền riêng tư khách hàng (`contactConsent`):**
  - Nếu `contactConsent === true`: Hiển thị số điện thoại (có link `tel:`) và email (có link `mailto:`) kèm huy hiệu xác thực.
  - Nếu `contactConsent === false`: Che giấu hoàn toàn thông tin liên hệ ngoại sàn và hiển thị thông báo bảo mật rõ ràng.
- Chuyển đổi trạng thái xử lý:
  - **Đánh dấu hoàn thành (`COMPLETED`)**: Xác nhận tư vấn thành công.
  - **Từ chối yêu cầu (`REJECTED`)**: Bắt buộc nhập lý do từ chối hỗ trợ khách hàng (tối đa 500 ký tự).

### 3.3 Hợp tác Phân phối Nguồn Hàng MLS (`MlsTab`)
- Cho phép Agent truy cập vào nguồn bất động sản do các đại lý và chủ nhà uy tín chia sẻ.
- **Cơ chế Phân quyền Allowlists (VIEW vs MANAGE):**
  - `VIEW`: Cấp quyền xem tổng quan để khảo sát thị trường. **Địa chỉ chính xác (streetAddress) và tọa độ được backend tự động ẩn hoàn toàn**. Giao diện gắn huy hiệu `Quyền Xem (VIEW)` màu xanh dương kèm thông báo bảo mật địa chỉ.
  - `MANAGE`: Cấp quyền đồng quản lý dẫn khách. **Địa chỉ chi tiết đầy đủ được hiển thị rõ ràng**. Giao diện gắn huy hiệu `Đồng quản lý (MANAGE)` màu xanh ngọc.
- Cho phép chia sẻ tin đăng MLS cho môi giới đối tác (`GrantMlsModal`) với quyền lựa chọn `VIEW` hoặc `MANAGE` và hạn dùng tự động thu hồi.

### 3.4 Báo cáo Yêu cầu Tư vấn Cho Chủ Nhà (`InquiriesTab`)
- Giúp chủ sở hữu bất động sản theo dõi lưu lượng và mức độ quan tâm của thị trường đối với từng bất động sản của mình.
- Bảo vệ dữ liệu người mua: Chỉ hiển thị thời gian gửi, trạng thái xử lý của sàn và thông tin cơ bản của tin đăng, không chuyển giao trực tiếp số điện thoại nếu khách hàng chưa chỉ định liên hệ trực tiếp chủ nhà.

---

## 4. QUY TRÌNH KIỂM THỬ & BẰNG CHỨNG XÁC MINH

### 4.1 Kiểm thử Đơn vị & Tích hợp (Vitest)
```bash
# Chạy toàn bộ 176 test frontend
npm --prefix frontend test -- --run

# Chạy toàn bộ 132 test backend
npm --prefix backend test
```
- **Kết quả Frontend:** 17/17 test suites vượt qua, 176/176 tests passed (bao gồm `workspace.test.tsx` và `bff-workspace-routes.test.ts`).
- **Kết quả Backend:** 5/5 spec suites vượt qua, 132/132 tests passed (Bao gồm MLS spec, Contact Requests spec, Listings spec, Auth spec).

### 4.2 Kiểm tra Chuẩn Code (Linting) & Production Build
```bash
# Frontend ESLint (Next.js 16 / React 19)
npm --prefix frontend run lint
# Output: 0 errors, 0 warnings

# Backend Oxlint
npm --prefix backend run lint
# Output: 0 errors, 0 warnings

# Build ứng dụng
npm --prefix backend run build    # NestJS build: Exit code 0
npm --prefix frontend run build   # Next.js build: Exit code 0
```

### 4.3 Xác thực Trình duyệt Thực tế với Chrome DevTools Protocol (Port 9236)
Kịch bản kiểm thử tự động tại `scratch/browser-verify-workspaces.mjs` kiểm tra 5 tình huống:
1. **SCENARIO 1 - Chuyển hướng khách vãng lai:** Truy cập `/vi/quan-ly` khi chưa đăng nhập -> Tự động chuyển hướng đến `/vi/login?returnTo=%2Fvi%2Fquan-ly`.
2. **SCENARIO 2 - Bàn làm việc Chủ nhà (Owner):** Đăng nhập `owner@example.test`, xác nhận hiển thị huy hiệu OWNER, các tab dành riêng cho Chủ nhà, danh sách tin đăng thực tế và tính năng nộp duyệt lại tin bị từ chối.
3. **SCENARIO 3 - Xử lý Lead Môi giới (Agent):** Đăng nhập `agent_a@example.test`, vào tab `leads`, xác nhận bảo vệ quyền riêng tư `contactConsent` và thao tác hoàn thành yêu cầu tư vấn.
4. **SCENARIO 4 - Kho tin chia sẻ MLS:** Kiểm tra hiển thị huy hiệu phân quyền `VIEW` (ẩn số nhà) so với `MANAGE` (hiện số nhà chi tiết).
5. **SCENARIO 5 - Hiển thị Đáp ứng Di động (Mobile 390x844):** Kiểm tra viewport điện thoại, xác nhận không có tràn ngang (`scrollWidth <= clientWidth`), tab trượt mượt mà.

Ảnh chụp màn hình minh chứng được lưu trữ tại:
`brain/6faa8008-c0c1-45ef-8ecf-6d64a84e6d21/phase2e3-workspaces/`

---

## 5. HƯỚNG DẪN BẢO TRÌ & MỞ RỘNG
1. **Khi bổ sung trường thông tin mới cho tin đăng:** Cần cập nhật đồng thời schema Prisma (`database/prisma/schema.prisma`), DTO NestJS (`backend/src/listings/dto/`), BFF validation route (`frontend/src/app/api/listings/route.ts`) và interface TypeScript (`frontend/src/types/workspace.ts`).
2. **Khi thay đổi thuật toán phân phối Agent:** Chỉnh sửa phương thức `selectCandidateAgent` tại `backend/src/contact-requests/contact-requests.service.ts` để đảm bảo phân bổ đồng đều tải công việc (Workload Distribution).
3. **Tuyệt đối không đẩy JWT về client:** Mọi tương tác yêu cầu phân quyền trong tương lai phải được định tuyến qua BFF để đính kèm cookie `batdongsan_session`.
