# BÁO CÁO TIẾN ĐỘ PHASE 2D-1: INTERNAL MLS BACKEND (CHÍNH SÁCH BẢO MẬT & MA TRẬN CÔNG BỐ ĐÃ PHÊ DUYỆT)

- **Dự án:** Batdongsan (Website tìm kiếm và quản lý bất động sản tích hợp MLS nội bộ)
- **Nhánh hiện tại:** `feat/phase2d-mls` (HEAD: `72e5d92`)
- **Cơ sở dữ liệu:** PostgreSQL 16 Native Windows (`postgresql-x64-16`, `localhost:5432`, database `batdongsan`). Không dùng Docker.
- **Ngày báo cáo:** 30/10/2026 (Cập nhật hoàn thiện theo chính sách quyền riêng tư MLS đã phê duyệt)
- **Trạng thái phạm vi Phase 2D-1:** **COMPLETE & READY FOR CHECKPOINT REVIEW** (Hoàn tất toàn diện phạm vi MVP cho backend chia sẻ MLS, cấp/thu hồi quyền, xem lịch sử, danh sách nhận quyền và đọc chi tiết nội bộ theo allowlist tường minh; tách biệt và bảo lưu tính năng chỉnh sửa của MANAGE cùng quy trình giao tiếp trực tiếp môi giới - chủ tin).

---

## 1. Kết quả thực hiện & Thống nhất chính sách bảo mật (Approved MLS Privacy Policy)

### 1.1 Quyền sở hữu tin độc lập với vai trò (Role-Independent Ownership & AGENT-as-Owner)
- **Quy tắc cốt lõi:** Trong hệ thống Batdongsan, cả `OWNER` và `AGENT` đều có quyền tạo và sở hữu tin đăng. Quyền sở hữu tin được xác định chính xác theo `listing.ownerId === caller.id`, không căn cứ đơn thuần vào vai trò `OWNER`.
- **Độc lập hai tư cách:** Một `AGENT` sở hữu tin đăng X vẫn hoàn toàn có thể nhận quyền chia sẻ MLS (`VIEW` hoặc `MANAGE`) trên tin đăng Y của người khác. Hệ thống và ma trận phân quyền không coi hai tư cách này là loại trừ lẫn nhau.
- **Quyền hạn chủ tin:**
  - `AGENT` sở hữu tin `APPROVED` có đầy đủ quyền cấp chia sẻ (`POST /api/mls/shares`), thu hồi quyền (`POST /api/mls/shares/:id/revoke`) và xem toàn bộ lịch sử chia sẻ (`GET /api/mls/listings/:id/shares`) của tin mình sở hữu.
  - `AGENT` nhận chia sẻ (`recipient`) tuyệt đối không có quyền tái chia sẻ (re-share), không được thu hồi quyền hoặc xem lịch sử chia sẻ của người khác (`403 Forbidden`).

### 1.2 Chính sách công bố thông tin đã phê duyệt (Stakeholder-Approved Disclosure Allowlists)
Phía máy chủ áp dụng cơ chế lọc tường minh (explicit response allowlists) cho từng đối tượng truy cập, tuyệt đối không gửi dư thừa dữ liệu rồi chỉ ẩn ở frontend:

1. **Chủ sở hữu tin (`ownerId`) và Quản trị viên (`ADMIN`):**
   - Được xem đầy đủ chi tiết tin nội bộ gồm địa chỉ chính xác (`streetAddress`), tọa độ (`latitude`, `longitude`) và thông tin liên hệ đầy đủ của chủ tin (`owner: { id, fullName, email, phone }`).
   - Giữ nguyên các hạn chế kiểm duyệt và sửa đổi hiện có.
   - Tuyệt đối không để lộ mật khẩu băm (`passwordHash`), dữ liệu cá nhân không liên quan hoặc quan hệ nội bộ (`moderationLogs`).
2. **Môi giới nhận quyền `VIEW`:**
   - Được xem các thông tin tin đăng cơ bản và vị trí cấp hành chính Tỉnh/Thành, Quận/Huyện, Phường/Xã.
   - **Tuyệt đối KHÔNG nhận:** `streetAddress`, tọa độ chính xác (`latitude`, `longitude`), và email/số điện thoại của chủ tin (`owner.email`, `owner.phone`).
   - Quyền `VIEW` đóng vai trò là tính năng cộng tác/tuyển chọn giỏ hàng (collaboration/curation) các tin được ủy quyền chia sẻ một cách có tổ chức; không bịa đặt thêm các trường dữ liệu mật khác để phân biệt với dữ liệu công khai.
3. **Môi giới nhận quyền `MANAGE`:**
   - Được xem các thông tin như quyền `VIEW` kèm theo địa chỉ cụ thể (`streetAddress`) và tọa độ chính xác (`latitude`, `longitude`) phục vụ khảo sát thực địa nội bộ.
   - **Tuyệt đối KHÔNG nhận:** email và số điện thoại của chủ tin (`owner.email`, `owner.phone`).
   - `MANAGE` hiện tại là quyền truy cập thông tin nội bộ có giới hạn, chưa cho phép chỉnh sửa, can thiệp kiểm duyệt, thay đổi quyền sở hữu hay tái chia sẻ.
4. **Endpoint tin đăng công khai (`/api/listings/*`):**
   - Giữ nguyên tuyệt đối không thay đổi; tiếp tục ẩn địa chỉ cụ thể, tọa độ và thông tin liên hệ nhạy cảm đối với người dùng vãng lai và Buyer.

### 1.3 Quy trình liên hệ Môi giới - Chủ tin (Broker-to-Owner Communication Workflow)
- Khẳng định rõ: Mô-đun Yêu cầu tư vấn/Phân công (Contact Requests/Assignments) hiện tại chỉ phục vụ phân phối yêu cầu của khách hàng (Buyer), **không cung cấp** kênh giao tiếp giữa môi giới và chủ nhà.
- Quy trình liên hệ trực tiếp broker-to-owner (tin nhắn, tiết lộ liên hệ khi chốt giao dịch, cơ chế chia hoa hồng và sự đồng ý của chủ tin) được xác định là **yêu cầu trong tương lai (Future Requirement)** và không triển khai trong phạm vi Phase 2D-1.

### 1.4 Xử lý bản ghi hết hạn (`expired-but-isActive`) với Unique Index
- Cơ chế partial unique index PostgreSQL: `UNIQUE (listingId, receivedById) WHERE (isActive = true)`.
- Khi chủ tin re-grant cho một môi giới mà bản ghi cũ đã hết hạn (`expiresAt <= now` nhưng `isActive = true`): Trong cùng một `$transaction`, hệ thống tự động cho "nghỉ hưu" (retire) bản ghi cũ (`isActive = false`, `revokedAt = expiresAt` hoặc thời điểm hiện tại), ghi nhật ký `AuditLog` với `action: 'mls.expire'`, sau đó tạo bản ghi mới với `isActive = true`.
- Bảo toàn 100% lịch sử chia sẻ, không phát sinh xung đột unique constraint, không xóa dữ liệu và không làm thay đổi database schema/migration.

### 1.5 Tính nguyên tử của Giao dịch & Rollback
- Cấp quyền (`grantShare`), thu hồi quyền (`revokeShare`), và tái cấp quyền kèm nghỉ hưu bản ghi cũ (`regrantShare`) đều được bọc trong `this.prisma.$transaction`.
- Khi ghi `AuditLog` gặp sự cố, toàn bộ giao dịch lập tức rollback, ngăn chặn hoàn toàn tình trạng mất đồng bộ dữ liệu.

---

## 2. Ma trận công bố thông tin chi tiết (Field Disclosure Allowlist Matrix)

Bảng chi tiết các trường dữ liệu được trả về trên endpoint chi tiết MLS `GET /api/mls/listings/:id` và danh sách nhận `GET /api/mls/shares/received`:

| Trường dữ liệu | Khách công khai (`/api/listings`) | Môi giới nhận `VIEW` | Môi giới nhận `MANAGE` | Chủ tin (`ownerId`) | Quản trị viên (`ADMIN`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `id`, `title`, `description` | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `propertyType`, `transactionType`, `priceVnd` | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `areaSqm`, `images`, `status` | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `province`, `district`, `ward` | ✅ Có | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `streetAddress` | ❌ **Ẩn** | ❌ **Lược bỏ** | ✅ **Có** | ✅ **Có** | ✅ **Có** |
| `latitude`, `longitude` | ❌ **Ẩn** | ❌ **Lược bỏ** | ✅ **Có** | ✅ **Có** | ✅ **Có** |
| `owner.id`, `owner.fullName` | ✅ Có (cơ bản) | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `owner.email`, `owner.phone` | ❌ **Ẩn** | ❌ **Lược bỏ** | ❌ **Lược bỏ** | ✅ **Có** | ✅ **Có** |
| `owner.passwordHash` | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** |
| `moderationLogs` | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** | ❌ **Không bao giờ** |
| `accessContext` | ❌ Không có | ✅ Có (`permission: VIEW`) | ✅ Có (`permission: MANAGE`) | ✅ Có (`isOwner: true`) | ✅ Có (`role: ADMIN`) |

---

## 3. Ma trận phân quyền các Endpoint MLS chuẩn tắc (Canonical API Routes Matrix)

| Endpoint | Phương thức | BUYER | OWNER (Chủ tin) | AGENT (Chủ tin) | AGENT (Nhận VIEW) | AGENT (Nhận MANAGE) | AGENT (Chưa có quyền) | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/mls/shares` | `POST` | ❌ 403 | ✅ **Cho phép** | ✅ **Cho phép** | ❌ 403 (Không re-share) | ❌ 403 (Không re-share) | ❌ 403 | ❌ 403 (Chỉ chủ tin) |
| `/api/mls/shares/:id/revoke` | `POST` | ❌ 403 | ✅ **Cho phép** | ✅ **Cho phép** | ❌ 403 | ❌ 403 | ❌ 403 | ✅ **Cho phép** (Giám sát) |
| `/api/mls/shares/:id` | `DELETE` | ❌ 403 | ✅ **Cho phép** | ✅ **Cho phép** | ❌ 403 | ❌ 403 | ❌ 403 | ✅ **Cho phép** (Giám sát) |
| `/api/mls/shares/received` | `GET` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Có (Ẩn address/contact) | ✅ Có (Hiện address, ẩn contact) | ✅ Có (Mảng rỗng) | ❌ 403 |
| `/api/mls/listings/:id/shares` | `GET` | ❌ 403 | ✅ **Cho phép** | ✅ **Cho phép** | ❌ 403 | ❌ 403 | ❌ 403 | ✅ **Cho phép** |
| `/api/mls/listings/:id` | `GET` | ❌ 403 | ✅ Đầy đủ | ✅ Đầy đủ | ✅ Lược bỏ address/contact | ✅ Hiện address, ẩn contact | ❌ 403 | ✅ Đầy đủ |

---

## 4. Bằng chứng kiểm tra thực tế (Execution Evidence)

### 4.1 Unit Tests (`npm test`)
Toàn bộ **84 tests** (mocked) trên 4 test suites đều vượt qua (trong đó `src/mls/mls.spec.ts` gồm 39 tests bao phủ toàn bộ các nhánh kiểm tra allowlist và phân quyền):
```
 RUN  v4.1.12 D:/Batdongsan/backend

 ✓ src/mls/mls.spec.ts (39 tests) 43ms
 ✓ src/app.controller.spec.ts (1 test) 744ms
 ✓ src/listings/listings.spec.ts (28 tests) 341ms
 ✓ src/auth/auth.spec.ts (16 tests) 1064ms

 Test Files  4 passed (4)
      Tests  84 passed (84)
   Duration  4.37s
```

### 4.2 Integration & Concurrency Tests trên PostgreSQL 16 thật (`npm run test:e2e`)
Toàn bộ **48 tests** (thực thi trên CSDL PostgreSQL 16 Windows thật với Supertest HTTP requests) đều vượt qua:
```
 RUN  v4.1.12 D:/Batdongsan/backend

 ✓ test/mls.e2e-spec.ts (32 tests) 1291ms
       ✓ allows listing owner to grant MLS VIEW access to active AGENT
       ✓ rejects duplicate active grant with 409 Conflict
       ✓ safely handles concurrent duplicate grants (exactly one succeeds with 201, other gets 409)
       ✓ authorized agent receiving VIEW: may view permitted info but strictly omits streetAddress, coordinates, and owner email/phone
       ✓ authorized agent receiving MANAGE: includes streetAddress and coordinates, but strictly omits owner email/phone
       ✓ listing owner and ADMIN can view internal detail directly with full authorized contacts and address
       ✓ active AGENT who owns the listing can grant MLS share to another AGENT
       ✓ recipient AGENT cannot re-share listing owned by another AGENT (403)
       ✓ recipient AGENT cannot revoke share (403)
       ✓ recipient AGENT cannot view share history (403)
       ✓ owner AGENT can view share history (200)
       ✓ owner AGENT can revoke share (200)
       ✓ AGENT owning listing X and receiving share on listing Y can access both with correct allowlists
       ✓ re-granting on an expired active share automatically retires old share and creates new active grant
 ✓ test/listings.e2e-spec.ts (15 tests) 3249ms
       ✓ PATCH racing with a status change to PENDING must NOT modify the listing (409)
       ✓ two competing moderation decisions: exactly one succeeds and exactly one ModerationLog exists
 ✓ test/app.e2e-spec.ts (1 test) 285ms

 Test Files  3 passed (3)
      Tests  48 passed (48)
   Duration  9.96s
```

### 4.3 Tính cô lập và toàn vẹn dữ liệu CSDL (Database Isolation)
Dấu vân tay CSDL được đối chiếu nghiêm ngặt trước và sau khi toàn bộ e2e test suite chạy:
```
[isolation] baseline={"listings":10,"shares":3,"auditLogs":0,"users":5} after={"listings":10,"shares":3,"auditLogs":0,"users":5}
[isolation] run-created listings cleaned: 4; run-created users cleaned: 1; baseline={"listings":10,"logs":1,"users":5,...} after={"listings":10,"logs":1,"users":5,...}
```
Không phát sinh bất kỳ bản ghi rác nào và không làm biến đổi dữ liệu seed ban đầu.

### 4.4 Biên dịch, Linter và Git Diff
- `npm run build`: **PASS** (`nest build` biên dịch sạch, không lỗi kiểu dữ liệu TS).
- `npm run lint`: **PASS** (`oxlint` trên 38 files, 0 warnings, 0 errors).
- `git diff --check`: **PASS** (Không có lỗi khoảng trắng thừa).

### 4.5 Báo cáo Quét bảo mật (`npm audit`)
- Kết quả quét hiện tại: **3 high severity vulnerabilities** (`body-parser`, `multer`, `@nestjs/platform-express`).
- Đây là các cảnh báo phụ thuộc gián tiếp từ thư viện NestJS core upstream (`@nestjs/platform-express`). Tuân thủ nghiêm ngặt ràng buộc của dự án: không tự ý chạy `npm audit fix` gây xung đột phiên bản.

---

## 5. Các tính năng và quy trình được bảo lưu/trì hoãn (Deferred Scope)

1. **Chức năng chỉnh sửa tin của `MANAGE` (Deferred Editing):**
   - Không hỗ trợ sửa tin `APPROVED` trong phạm vi này để bảo vệ quy trình kiểm duyệt (Moderation).
   - Quyền `MANAGE` hiện chỉ là quyền truy cập thông tin nội bộ (cho phép xem thêm địa chỉ và tọa độ chi tiết).
2. **Quy trình trao đổi Môi giới - Chủ tin (Broker-to-Owner Messaging & Disclosure):**
   - Được bảo lưu cho các giai đoạn nâng cao tiếp theo.
3. **Không thay đổi Schema/Migration:**
   - Bảo toàn 100% schema Prisma hiện tại và các giá trị enum `MlsSharePermission: VIEW, MANAGE`.

---

## 6. Trạng thái Git hiện tại (Git Status)

- **Nhánh hiện tại:** `feat/phase2d-mls`
- **Xác nhận trạng thái cây làm việc (Working Tree):**
  Cây làm việc hiện **KHÔNG SẠCH (NOT CLEAN)** do chứa các tệp đã sửa đổi và các tệp mới chưa theo dõi (untracked) phục vụ hoàn thiện Phase 2D-1, sẵn sàng cho việc checkpoint review và commit tiếp theo:
  ```text
   M backend/src/app.module.ts
   M backend/src/mls/mls.service.ts
   M backend/src/mls/mls.spec.ts
   M backend/test/mls.e2e-spec.ts
   M backend/vitest.config.e2e.ts
   M docs/01-requirements.md
  ?? backend/src/mls/dto/
  ?? backend/src/mls/mls.controller.ts
  ?? backend/src/mls/mls.module.ts
  ?? docs/reports/PHASE2D1_MLS_BACKEND_PROGRESS_2026-10-30.md
  ```
- **Tuân thủ quy tắc an toàn:** Không chạy `git add`, `git commit`, `git push`, `git merge`, `git checkout`, `git reset`, `git clean` hay `git stash`.

---

## 7. Kết luận & Sẵn sàng cho Checkpoint Review

Phạm vi MVP của Phase 2D-1 (Internal MLS Backend) đã hoàn thành đầy đủ, chính xác theo toàn bộ các yêu cầu của chính sách bảo mật đã được Stakeholder phê duyệt:
- [x] Lọc allowlist phía máy chủ riêng biệt cho Owner/Admin, MANAGE, và VIEW.
- [x] Bảo vệ tuyệt đối `streetAddress`, `latitude`, `longitude`, `owner.email`, `owner.phone` đối với `VIEW`.
- [x] Cung cấp `streetAddress`, `latitude`, `longitude` nhưng lược bỏ `owner.email`, `owner.phone` đối với `MANAGE`.
- [x] Đảm bảo quyền sở hữu dựa trên `ownerId`, hỗ trợ `AGENT` vừa sở hữu tin vừa nhận chia sẻ tin khác.
- [x] Tự động nghỉ hưu bản ghi hết hạn khi re-grant, bảo toàn lịch sử và tương thích partial unique index.
- [x] Toàn bộ 84 unit tests và 48 real-PostgreSQL e2e tests đều PASS, build và lint PASS.

**ĐÁNH GIÁ:** Phạm vi MLS MVP Phase 2D-1 đã **HOÀN TOÀN SẴN SÀNG CHO CHECKPOINT REVIEW**.
