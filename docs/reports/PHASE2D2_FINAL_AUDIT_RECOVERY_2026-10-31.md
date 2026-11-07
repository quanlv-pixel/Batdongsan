# BÁO CÁO PHỤC HỒI KIỂM ĐỊNH CUỐI CÙNG (FINAL AUDIT RECOVERY) — PHASE 2D-2 CONTACT REQUESTS & AGENT ASSIGNMENTS

**Ngày thực hiện kiểm định:** 2026-10-31\
**Môi trường:** Node.js v24.22.0, PostgreSQL 16 Native Windows (port 5432), Prisma 7.10.1 với `@prisma/adapter-pg`, NestJS 12\
**Thư mục làm việc:** `D:\Batdongsan`\
**Nhánh Git:** `feat/phase2d2-contact-requests`\
**Base commit:** `0a355a7` (`feat(mls): implement internal mls sharing lifecycle and approved disclosure allowlists`)

---

## 1. Tóm tắt điều hành (Executive Summary)

Đợt kiểm định độc lập và phục hồi bằng chứng nghiệm thu (Final Audit Recovery) cho Phase 2D-2 (Yêu cầu tư vấn & Phân công Môi giới) đã hoàn tất toàn bộ các bước kiểm tra mã nguồn, cấu hình Git, kiểm tra cơ sở dữ liệu thật PostgreSQL 16, thực thi toàn bộ các bộ kiểm thử tự động và đối soát dấu vân tay dữ liệu.

- **Kết quả tổng quát:**
  - Toàn bộ 127/127 unit tests (bao gồm 43/43 tests riêng cho Contact Requests) đều vượt qua.
  - Toàn bộ 88/88 real PostgreSQL E2E tests (bao gồm 40/40 tests riêng cho Contact Requests) đều vượt qua.
  - Biên dịch TypeScript (`nest build`) và rà soát lint (`oxlint`) đạt 0 lỗi, 0 cảnh báo.
  - Chỉ mục duy nhất một phần (`request_assignments_contactRequestId_key`) đang hoạt động chính xác trên cơ sở dữ liệu thật PostgreSQL, duy trì tính toàn vẹn 0 bản ghi trùng lặp active assignment.
  - Dấu vân tay cơ sở dữ liệu (Database Fingerprint) trước và sau khi chạy toàn bộ E2E suite hoàn toàn trùng khớp 100% với baseline ban đầu của người dùng (`{"listings":10,"shares":3,"contactRequests":2,"requestAssignments":3,"auditLogs":0,"users":5}`).
  - Không có bất kỳ file mã nguồn ứng dụng (`src/`) nào bị chỉnh sửa trong đợt phục hồi kiểm định này.
- **Khuyến nghị nghiệm thu (Acceptance Recommendation):** **READY FOR USER ACCEPTANCE** (Sẵn sàng để người dùng nghiệm thu và quyết định commit/push).

---

## 2. Bối cảnh phục hồi kiểm định (Audit Recovery Context)

1. **Bằng chứng được phục hồi từ phiên làm việc trước:**
   - Dấu vân tay cơ sở dữ liệu ban đầu do người dùng kiểm tra qua `backend/check-db-fingerprint.mjs`.
   - File lưu trữ patch rà soát `phase2d2-review.patch` (phản ánh 3.678 dòng thay đổi ban đầu đã được stage).
   - Báo cáo tiến độ ban đầu tại `docs/reports/PHASE2D2_CONTACT_REQUESTS_BACKEND_PROGRESS_2026-10-31.md`.
2. **Các hạng mục được thực thi kiểm tra lại độc lập trong lượt này:**
   - Trực tiếp kiểm tra tình trạng Git: `git status -sb`, `git branch --show-current`, `git log -1 --oneline`, `git diff --stat HEAD`, `git diff --cached --stat`, `git diff --check`.
   - Chạy lệnh kiểm tra dấu vân tay trước kiểm thử: `node .\check-db-fingerprint.mjs` -> xác nhận khớp baseline `{"listings":10,"shares":3,"contactRequests":2,"requestAssignments":3,"auditLogs":0,"users":5}`.
   - Truy vấn danh mục PostgreSQL hệ thống (`pg_indexes`) kiểm tra định nghĩa chỉ mục thực tế của `request_assignments`.
   - Thực thi bộ unit test đầy đủ (`npm test`): 127/127 tests passed.
   - Thực thi biên dịch mã nguồn (`npm run build`): hoàn tất thành công.
   - Thực thi phân tích tĩnh (`npm run lint`): 0 warnings, 0 errors.
   - Thực thi bộ E2E test thật (`npm run test:e2e`): 88/88 tests passed.
   - Chạy lệnh kiểm tra dấu vân tay sau E2E test: `node .\check-db-fingerprint.mjs` -> xác nhận nguyên vẹn baseline.
3. **Các hạng mục không bị giả định:**
   - Không giả định kết quả test từ báo cáo cũ; mọi con số trong báo cáo này đều được đo lường từ lần chạy thực tế trong phiên hiện tại.
   - Không giả định sự an toàn của transaction nếu chỉ dùng `prisma.$transaction`; toàn bộ vị ngữ khóa điều kiện (`updateMany`) và chỉ mục PostgreSQL đã được rà soát trực tiếp.

---

## 3. Trạng thái Git (Git State)

- **Nhánh hiện tại:** `feat/phase2d2-contact-requests`
- **Quan hệ commit:** Trực tiếp trên base commit `0a355a7` (`HEAD` của nhánh cha `feat/phase2d-mls`).
- **Tình trạng Staged (`git diff --cached --stat`):**
  - Gồm 14 files, 3.678 insertions(+), 13 deletions(-). Phản ánh mã nguồn triển khai ban đầu của Phase 2D-2 (trùng khớp với nội dung `phase2d2-review.patch`).
- **Tình trạng Unstaged (`git diff`):**
  - Gồm các cải tiến của đợt remediation (tăng từ 3.678 lên 4.282 insertions(+)), bao gồm việc hoàn thiện ma trận trạng thái, conditional update, phân định `/assign` và `/reassign`, xử lý Prisma 7 error, bổ sung 11 unit tests và 14 E2E tests, cập nhật tài liệu yêu cầu và báo cáo.
- **Tình trạng Untracked:**
  - `backend/check-db-fingerprint.mjs`: Script đo kiểm dấu vân tay DB do người dùng tạo thủ công (được giữ nguyên vẹn tuyệt đối).
  - `phase2d2-review.patch`: File patch review gốc (được bảo tồn nguyên vẹn).
  - `docs/reports/PHASE2D2_FINAL_AUDIT_RECOVERY_2026-10-31.md`: File báo cáo kiểm định phục hồi này.
- **Kiểm tra định dạng (`git diff --check`):** Mã thoát 0, không có lỗi thụt lề, ký tự lạ hay khoảng trắng thừa ở cuối dòng/cuối file.

---

## 4. Kết quả rà soát mã nguồn (Code Review Findings)

Qua rà soát chi tiết từng phương thức và DTO:

| STT | Vấn đề rà soát | Mức độ nghiêm trọng | File & Phương thức bị ảnh hưởng | Trạng thái hiện tại |
|---|---|---|---|---|
| 1 | Lỗ hổng chuyển đổi trạng thái đảo ngược `IN_PROGRESS -> NEW` hoặc `NEW -> IN_PROGRESS` qua PATCH status trực tiếp | Critical (Nghiệp vụ) | `contact-requests.service.ts` -> `updateStatus()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Ma trận trạng thái kiểm tra tường minh, cấm chuyển qua PATCH mà bắt buộc qua phân công; cấm đảo ngược về NEW; cấm giữ nguyên trạng thái. |
| 2 | Đọc dữ liệu ngoài transaction gây nguy cơ Stale Read & Race Condition | High (Đồng thời) | `contact-requests.service.ts` -> `createRequest()`, `assignAgent()`, `reassignAgent()`, `reopenRequest()`, `updateStatus()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: 100% các câu truy vấn xác thực đều nằm trong `prisma.$transaction`. `updateStatus()` sử dụng `updateMany` với điều kiện status hiện tại. |
| 3 | Lẫn lộn ngữ nghĩa giữa phân công lần đầu (`/assign`) và điều phối lại (`/reassign`) | Medium (API Contract) | `contact-requests.service.ts` -> `assignAgent()`, `reassignAgent()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: `/assign` ném 409 nếu đã có active assignment. `/reassign` ném 409 nếu chưa có active assignment (hướng dẫn dùng `/assign`), ném 400 nếu gán lại cho chính agent hiện tại hoặc yêu cầu đã kết thúc. |
| 4 | Bắt lỗi vi phạm chỉ mục duy nhất quá rộng hoặc sai cấu trúc lỗi của Prisma 7 `@prisma/adapter-pg` | High (Cơ sở dữ liệu) | `contact-requests.service.ts` -> `isAssignmentUniqueConflict()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Kiểm tra chính xác tên ràng buộc `request_assignments_contactRequestId_key` trên cả `err.cause?.constraint?.index`, `err.cause?.originalMessage`, `err.message` và `err.meta?.target`. Các lỗi P2002 khác không bị ánh xạ nhầm. |
| 5 | DTO chấp nhận tin nhắn toàn khoảng trắng (`message: "   "`) | Low (Validate dữ liệu) | `create-contact-request.dto.ts` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Thêm `@IsNotEmpty` kết hợp `@Transform` trim chuỗi, trả về 400 Bad Request nếu tin nhắn rỗng/chỉ chứa khoảng trắng. |
| 6 | Query filter `unassigned` ép kiểu chuỗi sai (`unassigned=abc` biến thành false) | Low (Validate dữ liệu) | `query-contact-requests.dto.ts` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Chuyển đổi chặt chẽ chuỗi `'true'`/`'false'`, trả về 400 Bad Request nếu giá trị không hợp lệ. |
| 7 | Bộ lọc danh sách Admin xung đột giữa `agentId` và `unassigned=true` | Low (Bộ lọc) | `contact-requests.service.ts` -> `getAllRequests()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Ném `BadRequestException` (400) nếu cả hai tham số được truyền đồng thời. |
| 8 | Lộ email của Agent trong phản hồi xem yêu cầu của Người mua (Buyer) | Medium (Quyền riêng tư) | `contact-requests.service.ts` -> `getMyRequests()`, `getRequestDetail()` | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ**: Khối `assignedAgent` trả về cho Buyer chỉ bao gồm `id`, `fullName`, `avatarUrl`, `phone`, `assignedAt` (đã loại bỏ `email`). |

---

## 5. Ma trận chuyển đổi trạng thái (Status Transition Matrix)

Kết quả kiểm tra chi tiết từng bước chuyển đổi:

| Trạng thái hiện tại | Trạng thái yêu cầu | Quyền hạn / Phương thức | Kết quả kỳ vọng | Kết quả thực tế kiểm tra mã nguồn & test | Đánh giá |
|---|---|---|---|---|---|
| `NEW` | `REJECTED` | ADMIN only qua `PATCH /:id/status` | Cho phép (`200 OK`) | Service kiểm tra `isAdmin`, cập nhật thành công và ghi AuditLog | **PASS** |
| `NEW` | `IN_PROGRESS` | Qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Cannot transition from NEW to IN_PROGRESS via status update. Use the assignment workflow." | **PASS** |
| `NEW` | `COMPLETED` | Bất kỳ ai qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Cannot transition directly from NEW to COMPLETED" | **PASS** |
| `NEW` | `NEW` | Bất kỳ ai qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Request is already in this status" | **PASS** |
| `IN_PROGRESS` | `COMPLETED` | Active assigned AGENT hoặc ADMIN | Cho phép (`200 OK`) | Kiểm tra vai trò và gán active hợp lệ, cập nhật thành công | **PASS** |
| `IN_PROGRESS` | `REJECTED` | Active assigned AGENT hoặc ADMIN | Cho phép (`200 OK`) | Kiểm tra vai trò và gán active hợp lệ, cập nhật thành công | **PASS** |
| `IN_PROGRESS` | `NEW` | Bất kỳ ai qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Cannot transition from IN_PROGRESS back to NEW" | **PASS** |
| `IN_PROGRESS` | `IN_PROGRESS` | Bất kỳ ai qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Request is already in this status" | **PASS** |
| `COMPLETED` | Bất kỳ trạng thái nào | Qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Terminal contact requests cannot be updated directly. Use the reopen workflow." | **PASS** |
| `REJECTED` | Bất kỳ trạng thái nào | Qua `PATCH /:id/status` | Bị cấm (`400 Bad Request`) | Ném `BadRequestException`: "Terminal contact requests cannot be updated directly. Use the reopen workflow." | **PASS** |
| `COMPLETED` / `REJECTED` | Mở lại về `IN_PROGRESS` hoặc `NEW` | ADMIN qua `POST /:id/reopen` | Cho phép (`200 OK`) | Yêu cầu `reason` bắt buộc, khôi phục phân công nếu hợp lệ hoặc gán tự động, ghi AuditLog | **PASS** |

---

## 6. Phân công lần đầu và Điều phối lại (Assignment & Reassignment)

1. **Phân công lần đầu (`POST /api/contact-requests/:id/assign`):**
   - *Phân quyền:* Chỉ `ADMIN` (`@Roles(Role.ADMIN)` kết hợp `RolesGuard`).
   - *Điều kiện tiên quyết:* Yêu cầu không ở trạng thái terminal (`COMPLETED`, `REJECTED`); chưa có bất kỳ phân công hoạt động nào (`assignments.length === 0`).
   - *Trường hợp xung đột:* Nếu đã có phân công hoạt động, ném ngay `409 ConflictException('An active assignment already exists for this request. Use reassign instead.')`.
   - *Xác thực Agent đích:* Truy vấn lại bảng `User` trong transaction, bắt buộc `role === Role.AGENT` và `isActive === true`.
   - *Tính nguyên tử:* Tạo bản ghi `RequestAssignment` (`isActive = true`), chuyển trạng thái yêu cầu từ `NEW` sang `IN_PROGRESS`, ghi `AuditLog` action `request.assign` trong cùng 1 transaction.
2. **Điều phối lại (`POST /api/contact-requests/:id/reassign`):**
   - *Phân quyền:* Chỉ `ADMIN` (`@Roles(Role.ADMIN)`).
   - *Điều kiện tiên quyết:* Yêu cầu không ở trạng thái terminal; bắt buộc phải đang tồn tại 1 phân công hoạt động (`activeAssignment`).
   - *Trường hợp thiếu phân công:* Nếu chưa có active assignment nào, ném `409 ConflictException('No active assignment exists for this request. Use assign instead.')`.
   - *Chống gán trùng:* Nếu `activeAssignment.agentId === dto.agentId`, ném `400 BadRequestException('Request is already actively assigned to this agent')`.
   - *Tính nguyên tử:* Cập nhật phân công cũ (`isActive = false, releasedAt = now()`), tạo phân công mới (`isActive = true, assignedAt = now()`), cập nhật trạng thái `IN_PROGRESS`, ghi `AuditLog` action `request.reassign` kèm `previousAgentId` và `newAgentId`. Toàn bộ lịch sử phân công được bảo toàn nguyên vẹn.

---

## 7. Kiểm định giao dịch và xử lý đồng thời (Transaction & Concurrency Audit)

1. **Phân tích ranh giới giao dịch (Transaction Boundary):**
   - Tất cả 5 phương thức biến đổi dữ liệu (`createRequest`, `assignAgent`, `reassignAgent`, `reopenRequest`, `updateStatus`) thực hiện toàn bộ logic nghiệp vụ bên trong `this.prisma.$transaction(async (tx) => { ... })`.
   - Mọi câu lệnh đọc (findUnique) dữ liệu phụ thuộc (Listing, User, ContactRequest, RequestAssignment) đều dùng đối tượng ngữ cảnh `tx`.
2. **Hành vi mức cô lập của PostgreSQL (PostgreSQL Read Committed Isolation):**
   - Ở mức cô lập mặc định READ COMMITTED của PostgreSQL, nếu hai giao dịch cùng đọc trạng thái `request.status` tại thời điểm T0, sau đó một giao dịch cập nhật thành công tại T1, giao dịch thứ hai nếu dùng lệnh cập nhật mù (`update({ where: { id } })`) có thể vô tình ghi đè trạng thái terminal hoặc trạng thái mới hơn.
3. **Giải pháp Cập nhật có điều kiện (Conditional Update Predicate):**
   - Trong `updateStatus()`, hệ thống sử dụng:
     ```typescript
     const updateResult = await tx.contactRequest.updateMany({
       where: {
         id,
         status: request.status, // Khóa vị ngữ: chỉ cập nhật nếu trạng thái trong DB vẫn trùng với trạng thái đã đọc
       },
       data: {
         status: dto.status,
       },
     });
     if (updateResult.count === 0) {
       throw new ConflictException('Request was modified concurrently. Please refresh and retry.');
     }
     ```
   - Kỹ thuật này phát hiện ngay lập tức bất kỳ sự thay đổi trạng thái đồng thời nào, chuyển hóa rủi ro silent overwrite thành lỗi HTTP 409 Conflict được kiểm soát chuẩn mực.
4. **Bảo vệ bằng chỉ mục duy nhất một phần (Partial Unique Index Mutual Exclusion):**
   - Khi có 2 tiến trình đồng thời thực thi `assignAgent` hoặc `reassignAgent` trên cùng một yêu cầu, cả hai đều có thể vượt qua bước kiểm tra SELECT ban đầu trong READ COMMITTED.
   - Tuy nhiên, khi cả hai cùng thực hiện lệnh `INSERT INTO "request_assignments" ("contactRequestId", "agentId", "isActive", ...) VALUES (..., true)`, chỉ mục một phần `WHERE ("isActive" = true)` ở tầng kernel PostgreSQL bắt buộc tuần tự hóa và ném lỗi vi phạm khóa duy nhất (SQLSTATE 23505) cho giao dịch thứ hai.
   - Giao dịch thứ hai rollback toàn bộ, không có dữ liệu mồ côi hay AuditLog rác nào được lưu lại.

---

## 8. Xác minh chỉ mục cơ sở dữ liệu thật (Database Index Verification)

Truy vấn thực tế trên danh mục hệ thống PostgreSQL qua câu lệnh:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'request_assignments';
```

**Kết quả ghi nhận trực tiếp từ cơ sở dữ liệu `batdongsan`:**
1. Khóa chính:
   `CREATE UNIQUE INDEX request_assignments_pkey ON public.request_assignments USING btree (id)`
2. Chỉ mục ngoại khóa ContactRequest:
   `CREATE INDEX "request_assignments_contactRequestId_idx" ON public.request_assignments USING btree ("contactRequestId")`
3. Chỉ mục ngoại khóa Agent:
   `CREATE INDEX "request_assignments_agentId_idx" ON public.request_assignments USING btree ("agentId")`
4. **Chỉ mục duy nhất một phần (Partial Unique Index):**
   `CREATE UNIQUE INDEX "request_assignments_contactRequestId_key" ON public.request_assignments USING btree ("contactRequestId") WHERE ("isActive" = true)`

**Kiểm tra tính toàn vẹn dữ liệu active assignment:**
```sql
SELECT "contactRequestId", COUNT(*) as cnt
FROM "request_assignments"
WHERE "isActive" = true
GROUP BY "contactRequestId"
HAVING COUNT(*) > 1;
```
- **Kết quả trả về:** `MULTI_ACTIVE: []` (chính xác 0 bản ghi vi phạm).
- **Kết luận:** Chỉ mục tồn tại đúng yêu cầu kiến trúc, có mệnh đề vị ngữ `WHERE ("isActive" = true)`, và dữ liệu trong cơ sở dữ liệu không hề có xung đột.

---

## 9. Xử lý lỗi Prisma và Adapter PostgreSQL (Prisma Error Handling)

Hàm trợ giúp `isAssignmentUniqueConflict(err)` trong `contact-requests.service.ts` được thiết kế tương thích đa tầng:
1. **Prisma Client tiêu chuẩn:** Kiểm tra `err.code === 'P2002'` và `err.meta?.target` chứa `request_assignments_contactRequestId_key` hoặc `contactRequestId`.
2. **Prisma 7 với `@prisma/adapter-pg` (PostgreSQL Driver Adapter):** Lỗi trả về trực tiếp từ native driver mang mã `err.cause?.originalCode === '23505'`, với tên chỉ mục vi phạm nằm ở `err.cause?.constraint?.index`. Hàm kiểm tra tường minh:
   ```typescript
   if (err?.cause?.constraint?.index === 'request_assignments_contactRequestId_key') {
     return true;
   }
   ```
3. **Phân biệt lỗi chính xác:** Các lỗi vi phạm unique constraint khác (ví dụ: trùng email người dùng `users_email_key`) sẽ trả về `false`, không bị biến thành `409 Conflict` của phân công mà ném ra đúng bản chất lỗi.

---

## 10. Quyền riêng tư và Phân quyền (Privacy & Authorization)

Hệ thống áp dụng chính sách allowlist nghiêm ngặt theo vai trò:

1. **Người mua (Buyer):**
   - Chỉ được xem các yêu cầu do chính mình tạo ra (`buyerId === caller.id`).
   - Thấy nội dung tin nhắn của mình, thông tin tóm tắt tin đăng và tóm tắt thông tin môi giới phụ trách (`id`, `fullName`, `avatarUrl`, `phone`, `assignedAt`).
   - **Tuyệt đối không thấy email của Môi giới**.
2. **Môi giới phụ trách (Active Assigned Agent):**
   - Chỉ truy cập được yêu cầu khi đang có bản ghi phân công hoạt động (`isActive === true`).
   - Xem được thông tin tin đăng, họ tên người mua.
   - **Chỉ được xem email và số điện thoại của Người mua nếu `contactConsent === true`**. Nếu `contactConsent === false`, email và điện thoại của người mua bị ẩn hoàn toàn.
   - Khi bị điều phối lại (`isActive` chuyển sang `false`), **ngay lập tức mất toàn bộ quyền truy cập** (trả về `403 Forbidden`).
3. **Chủ sở hữu tin đăng (Listing Owner):**
   - Xem danh sách yêu cầu liên quan đến tin đăng của mình qua endpoint riêng `GET /api/contact-requests/for-owned-listings`.
   - Nhận danh sách rút gọn siêu dữ liệu (**Metadata-only allowlist**): `id`, `listingId`, `status`, `createdAt`, `updatedAt`, tóm tắt tin.
   - **Tuyệt đối không nhận** họ tên, email, số điện thoại người mua, nội dung tin nhắn hay lịch sử môi giới.
4. **Quản trị viên (ADMIN):**
   - Không được phép gửi yêu cầu tư vấn (`POST /` bị từ chối với `403 Forbidden`).
   - Có toàn quyền xem toàn bộ danh sách, thông tin chi tiết, lịch sử phân công, thực hiện phân công lần đầu, điều phối lại, từ chối và mở lại yêu cầu terminal.
5. **Người dùng ngoài luồng (Unauthorized Users):**
   - Mọi người dùng không phải là người tạo, không phải chủ tin, không phải môi giới được phân công và không phải admin đều nhận `403 Forbidden` khi truy cập chi tiết.

---

## 11. Kiểm tra xác thực DTO và Bộ lọc Query (DTO & Query Validation)

1. **`CreateContactRequestDto`:**
   - `message`: Được cắt khoảng trắng (`@Transform`). Nếu truyền chuỗi toàn khoảng trắng `"   "`, `@IsNotEmpty` sẽ từ chối với `400 Bad Request`. Nếu không truyền, `@IsOptional` cho phép giá trị null.
   - `contactConsent`: Bắt buộc phải là kiểu boolean và có giá trị `true` (`@Equals(true)`), từ chối nếu thiếu hoặc bằng false.
2. **`QueryContactRequestsDto`:**
   - `unassigned`: Bộ chuyển đổi `@Transform` nhận diện chính xác giá trị `'true'`/`true` thành `true`, `'false'`/`false` thành `false`. Chuỗi bất kỳ khác (ví dụ: `unassigned=abc`) được giữ nguyên và bị `@IsBoolean` từ chối với `400 Bad Request`.
   - `getAllRequests()`: Kiểm tra logic nghiệp vụ từ chối kết hợp đồng thời `agentId` và `unassigned=true` với `400 Bad Request` ('Cannot filter by both agentId and unassigned=true').

---

## 12. Tính nhất quán của Nhật ký kiểm toán (AuditLog Consistency)

Trong mọi thao tác:
- Tạo yêu cầu: Ghi `request.create` (và `request.assign` nếu có tự động phân công).
- Phân công lần đầu: Ghi `request.assign` kèm `agentId`, `reason`.
- Điều phối lại: Ghi `request.reassign` kèm `previousAgentId`, `newAgentId`, `reason`.
- Cập nhật trạng thái: Ghi `request.status_change` kèm `fromStatus`, `toStatus`, `note`.
- Mở lại: Ghi `request.reopen` kèm `previousStatus`, `newStatus`, `reason`, `assignedAgentId`.
- **Đảm bảo tính nguyên tử:** Toàn bộ bản ghi AuditLog đều được tạo thông qua `tx.auditLog.create` bên trong cùng khối giao dịch với bản ghi nghiệp vụ. Nếu giao dịch bị rollback, AuditLog tương ứng không bao giờ tồn tại trong cơ sở dữ liệu.

---

## 13. Kết quả kiểm thử thực tế (Test Results)

Toàn bộ kết quả dưới đây được ghi nhận từ lần chạy thực tế trong phiên kiểm định này:

### 13.1. Unit Tests (`npm test`):
```text
> backend@0.0.1 test
> vitest run

 RUN  v4.1.12 D:/Batdongsan/backend

 ✓ src/mls/mls.spec.ts (39 tests) 169ms
 ✓ src/app.controller.spec.ts (1 test) 1822ms
 ✓ src/contact-requests/contact-requests.spec.ts (43 tests) 137ms
 ✓ src/listings/listings.spec.ts (28 tests) 617ms
 ✓ src/auth/auth.spec.ts (16 tests) 1701ms

 Test Files  5 passed (5)
      Tests  127 passed (127)
   Start at  22:59:12
   Duration  12.79s
```
- **Tổng cộng: 127/127 tests passed** (100%).
- Riêng Contact Requests: **43/43 tests passed**.

### 13.2. Real PostgreSQL E2E Tests (`npm run test:e2e`):
```text
> backend@0.0.1 test:e2e
> vitest run --config ./vitest.config.e2e.ts

 RUN  v4.1.12 D:/Batdongsan/backend

 ✓ test/listings.e2e-spec.ts (15 tests) 4057ms
 ✓ test/contact-requests.e2e-spec.ts (40 tests) 2835ms
 ✓ test/mls.e2e-spec.ts (32 tests) 2117ms
 ✓ test/app.e2e-spec.ts (1 test) 489ms

 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  23:00:37
   Duration  24.34s
```
- **Tổng cộng: 88/88 tests passed** (100%).
- Riêng Contact Requests: **40/40 tests passed**.
- **Kiểm thử tranh chấp E2E thực tế:**
  1. *Concurrent Reassignment Race:* 2 request `POST /:id/reassign` đồng thời trên cùng một request. Kết quả: `statuses.every((s) => s === 200 || s === 409)` đạt TRUE. Cơ sở dữ liệu duy trì chính xác 1 phân công hoạt động và 1 phân công đã giải phóng (`isActive: false`). Không phát sinh lỗi 500.
  2. *Concurrent First Assignment Race:* 2 request `POST /:id/assign` đồng thời trên request chưa phân công. Kết quả: `statuses.sort()` là `[201, 409]`. Cơ sở dữ liệu duy trì đúng 1 phân công hoạt động duy nhất. Không phát sinh lỗi 500.

### 13.3. Build và Lint:
- `npm run build`: Hoàn tất không có lỗi (`nest build` exit code 0).
- `npm run lint`: Hoàn tất không có lỗi (`oxlint src/ test/` -> `Found 0 warnings and 0 errors`).
- `git diff --check`: Hoàn tất không có lỗi (exit code 0).

---

## 14. Đối soát dấu vân tay cơ sở dữ liệu (Database Fingerprint Comparison)

Script kiểm tra: `node .\check-db-fingerprint.mjs`

- **Trước khi chạy E2E tests:**
  ```json
  {"listings": 10, "shares": 3, "contactRequests": 2, "requestAssignments": 3, "auditLogs": 0, "users": 5}
  ```
- **Sau khi chạy E2E tests:**
  ```json
  {"listings": 10, "shares": 3, "contactRequests": 2, "requestAssignments": 3, "auditLogs": 0, "users": 5}
  ```
- **Đánh giá:**
  - Cả 6 chỉ số đếm số lượng bản ghi của các bảng nghiệp vụ chính đều giữ nguyên giá trị trước và sau khi chạy test.
  - *Phạm vi xác thực:* Dấu vân tay xác nhận toàn bộ bản ghi sinh ra phục vụ kiểm thử (listings, contactRequests, requestAssignments, auditLogs, users) đã được dọn sạch hoàn toàn theo đúng thứ tự ràng buộc khóa ngoại trong `afterAll()`. Dữ liệu seed gốc của hệ thống không bị biến động về số lượng.

---

## 15. Danh sách các file bị thay đổi trong đợt phục hồi kiểm định (Files Modified During Recovery)

Trong đợt phục hồi kiểm định này:
- **Tuyệt đối KHÔNG có file mã nguồn ứng dụng (`src/`), DTO hay test nào bị chỉnh sửa.**
- File duy nhất được tạo mới là báo cáo kiểm định phục hồi này:
  `docs/reports/PHASE2D2_FINAL_AUDIT_RECOVERY_2026-10-31.md`

---

## 16. Rủi ro còn lại và các hạng mục sau MVP (Remaining Risks and Blockers)

1. **Các hạng mục đã ghi nhận hoãn sau MVP (Planned Deferred Features - Không phải lỗi):**
   - *Phân công môi giới theo khu vực địa lý (Agent Service Area Matching):* Bảng User chưa có trường khu vực phụ trách; sẽ triển khai khi có module Hồ sơ môi giới chi tiết.
   - *Phân công theo thứ hạng gói thuê bao (Agent Subscription Tier Matching):* Thuật toán ưu tiên môi giới theo gói thành viên VIP/Pro được hoãn sau MVP.
   - *Kênh nhắn tin trực tiếp Môi giới - Chủ tin (Broker-to-Owner Messaging):* Hệ thống hiện chỉ tập trung vào luồng phân phối khách hàng cho môi giới.
   - *Thông báo bên ngoài (Email / SMS / Push Notifications):* Tích hợp ở giai đoạn Notification Service bên thứ ba.
2. **Đánh giá rủi ro kỹ thuật:**
   - Không có rủi ro kỹ thuật nghiêm trọng nào tồn đọng trong phạm vi Phase 2D-2.

---

## 17. Khuyến nghị nghiệm thu cuối cùng (Final Acceptance Recommendation)

**READY FOR USER ACCEPTANCE**\
*(Sẵn sàng để người dùng nghiệm thu)*

- Triển khai Phase 2D-2 Contact Requests & Agent Assignments cùng đợt khắc phục remediation đã đáp ứng đầy đủ và chuẩn xác các tiêu chuẩn kỹ thuật, ma trận trạng thái, cô lập giao dịch, bảo vệ toàn vẹn chỉ mục duy nhất và quyền riêng tư theo vai trò.
- Toàn bộ working tree được bảo toàn nguyên trạng, không commit, không push, sẵn sàng để người dùng tiến hành rà soát thủ công và tạo commit chính thức.
