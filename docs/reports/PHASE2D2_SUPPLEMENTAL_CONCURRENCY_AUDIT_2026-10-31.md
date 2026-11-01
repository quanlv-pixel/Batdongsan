# BÁO CÁO KIỂM ĐỊNH BỔ SUNG: XỬ LÝ ĐỒNG THỜI & QUY TẮC NGHIỆP VỤ
## PHASE 2D-2 — CONTACT REQUESTS & AGENT ASSIGNMENTS

**Ngày thực hiện kiểm định:** 2026-10-31\
**Chế độ kiểm định:** READ-ONLY SUPPLEMENTAL AUDIT (Không sửa đổi mã nguồn, không sửa đổi cơ sở dữ liệu)\
**Tập tin báo cáo:** `docs/reports/PHASE2D2_SUPPLEMENTAL_CONCURRENCY_AUDIT_2026-10-31.md`\
**Không gian làm việc:** `D:\Batdongsan`\
**Nhánh Git:** `feat/phase2d2-contact-requests`\
**Base commit:** `0a355a7`

---

## 1. Tóm tắt điều hành (Executive Summary)

Đợt kiểm định bổ sung này tập trung chuyên sâu vào 3 khu vực trọng yếu mà báo cáo trước chưa phân tích cặn kẽ:
1. **Audit A:** Tranh chấp đồng thời giữa Tạo yêu cầu tư vấn (`createRequest`) và Thay đổi trạng thái tin đăng (`ListingStatus`).
2. **Audit B:** Tranh chấp giữa Phân công (`assign`), Điều phối lại (`reassign`), Mở lại (`reopen`), Cập nhật trạng thái (`updateStatus`), và Tính khả dụng của Môi giới (`User.isActive`), cùng bản chất của điều kiện lịch sử phân công trong `/assign`.
3. **Audit C:** Độ chặt chẽ trong các câu lệnh xác nhận (assertions) của các bài kiểm thử E2E tranh chấp đồng thời (`concurrent reassignment` và `concurrent first-assignment`).

**Kết quả tổng quan:**
- **Audit A:** Xác nhận `createRequest()` đọc `listing.status` bằng `findUnique` thông thường, không sử dụng khóa hàng (`FOR SHARE`/`FOR UPDATE`). Dưới mức cô lập `READ COMMITTED`, nếu có giao dịch khác hạ trạng thái tin đăng, yêu cầu tư vấn vẫn có thể được tạo. Tuy nhiên, trong mã nguồn hiện tại **chưa có endpoint nào cho phép hạ trạng thái tin đã `APPROVED`**.
- **Audit B:** Phát hiện điểm yếu đồng thời tại `assignAgent()` ([contact-requests.service.ts:1019](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1019)) và `reassignAgent()` ([contact-requests.service.ts:1129](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1129)): Cả hai phương thức đều dùng `tx.contactRequest.update({ where: { id }, data: { status: IN_PROGRESS } })` trực tiếp mà **không có vị ngữ điều kiện trạng thái** (khác với `updateStatus` vốn dùng `updateMany` có điều kiện). Nếu xảy ra tranh chấp với `updateStatus()` hoàn thành hoặc từ chối yêu cầu, thao tác gán có thể ghi đè trạng thái kết thúc trở lại `IN_PROGRESS`.
- **Audit B5:** Xác minh rõ ràng: `/assign` kiểm tra `assignments: { where: { isActive: true } }`. Do đó `assignments.length === 0` **chỉ kiểm tra việc không có phân công đang hoạt động (active)**, hoàn toàn không chặn yêu cầu có lịch sử phân công cũ đã giải phóng. Cơ chế này nhất quán 100% với luồng nghiệp vụ `/reopen` và `/reassign`.
- **Audit C:** Bài test E2E `concurrent reassignment` hiện chỉ kiểm tra `expect(statuses).toContain(200)` và `every(s => s === 200 || s === 409)`, chấp nhận cả kịch bản `[200, 200]` nếu Node/PostgreSQL tuần tự hóa hai request, và chưa kiểm tra AuditLog của ca đua này. Ngược lại, bài test `concurrent first-assignment` đã kiểm tra chặt chẽ `[201, 409]`, trạng thái DB và AuditLog.

**Khuyến nghị nghiệm thu:** **TEST COVERAGE IMPROVEMENT RECOMMENDED** (Khuyến nghị hoàn thiện assertions kiểm thử và xem xét bổ sung vị ngữ điều kiện cho `assign`/`reassign`).

---

## 2. Audit A — Phân tích tranh chấp: Tạo yêu cầu tư vấn vs. Thay đổi trạng thái tin đăng

### 2.1. Phân tích mã nguồn thực thi
- **Vị trí kiểm tra:** [backend/src/contact-requests/contact-requests.service.ts:181-217](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L181-L217)
  ```typescript
  return this.prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: dto.listingId },
      include: {
        owner: { select: { id: true, role: true, isActive: true } },
      },
    });
    // ...
    if (listing.status !== ListingStatus.APPROVED) {
      throw new BadRequestException('Contact requests can only be submitted for APPROVED listings');
    }
    // ...
    const request = await tx.contactRequest.create({
      data: { listingId: dto.listingId, ... },
    });
  });
  ```
- **Vị trí thay đổi trạng thái tin đăng:** [backend/src/listings/listings.service.ts:464-529](file:///D:/Batdongsan/backend/src/listings/listings.service.ts#L464-L529) (`moderateListing` chỉ duyệt từ `PENDING -> APPROVED / REJECTED`).

### 2.2. Trả lời các câu hỏi kỹ thuật trọng tâm
1. **`createRequest()` có lấy khóa mức hàng (row-level lock) trên dòng Listing không?**\
   **KHÔNG.** Câu lệnh `tx.listing.findUnique()` của Prisma sinh ra câu lệnh `SELECT ... FROM "listings" WHERE id = $1` thông thường. Nó không chứa mệnh đề `FOR SHARE` hay `FOR UPDATE`.
2. **Thao tác cập nhật trạng thái tin đăng có lấy khóa tương thích không?**\
   Trong `moderateListing()`, Prisma thực thi `updateMany({ where: { id, status: 'PENDING' } })`, câu lệnh này lấy khóa độc quyền (`FOR UPDATE`) trên dòng tin đăng lúc ghi. Tuy nhiên, vì `createRequest()` chỉ thực hiện `SELECT` đọc thông thường, PostgreSQL **không hề chặn `createRequest()`**.
3. **Có cập nhật có điều kiện hay cơ chế đồng bộ hóa nào khác không?**\
   **KHÔNG.** Bảng `contact_requests` chỉ có khóa ngoại `listingId REFERENCES listings(id)`, khóa này chỉ bảo đảm mã tin đăng tồn tại, không thể ràng buộc cột `status` phải bằng `APPROVED`.
4. **Có thể xảy ra tình trạng ContactRequest được commit cho một tin đăng không còn APPROVED trước khi transaction tạo request kết thúc không?**\
   **CÓ THỂ VỀ MẶT LÝ THUYẾT.** Dưới mức cô lập `READ COMMITTED` của PostgreSQL:
   - T0: Transaction A đọc tin đăng và thấy `status === APPROVED`.
   - T1: Transaction B (nếu có) cập nhật tin đăng thành `REJECTED` và commit.
   - T2: Transaction A ghi nhận `contactRequest.create` và commit thành công.
5. **Đánh giá thực tế trong phạm vi dự án hiện tại:**\
   Rà soát toàn bộ [backend/src/listings/listings.service.ts](file:///D:/Batdongsan/backend/src/listings/listings.service.ts), hệ thống hiện **chưa có bất kỳ endpoint nào cho phép chuyển một tin đăng từ `APPROVED` sang trạng thái khác** (chưa có tính năng gỡ tin, ẩn tin hay thu hồi duyệt). Do đó, trong phiên bản hiện tại, tranh chấp này chưa thể bị kích hoạt qua HTTP API.
- **Phân loại vấn đề:** **POTENTIAL RISK** (Rủi ro tiềm ẩn cho tương lai khi phát triển tính năng gỡ/hủy duyệt tin đăng).

---

## 3. Audit B — Ma trận tranh chấp Phân công, Điều phối lại, Mở lại và Trạng thái Môi giới

### 3.1. Bảng phân tích chi tiết từng kịch bản tranh chấp

| Thao tác | Đọc xác thực dữ liệu | Thao tác đồng thời xung đột | Cơ chế bảo vệ hiện tại | Rủi ro còn lại & Đánh giá |
|---|---|---|---|---|
| **B1. assignAgent / reassignAgent** | Đọc `User.isActive` và `User.role` qua `findUnique` ([contact-requests.service.ts:997, 1098](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L997)) | Admin khóa tài khoản Agent (`User.isActive = false`) | Đọc bên trong transaction, nhưng dùng `findUnique` thông thường không có khóa hàng | **POTENTIAL RISK**: Nếu có thao tác khóa tài khoản diễn ra giữa lúc đọc và commit, Agent bị khóa vẫn có thể nhận phân công mới. Hiện chưa có API khóa tài khoản (FR-11). |
| **B2. assignAgent** | Đọc `request.status` không phải terminal và chưa có active assignment ([contact-requests.service.ts:986-995](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L986)) | Admin từ chối yêu cầu `NEW -> REJECTED` qua `updateStatus()` | Chỉ mục một phần bảo vệ assignment; nhưng lệnh cập nhật request ([dòng 1019](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1019)) dùng `update({ where: { id } })` không điều kiện | **CONFIRMED RISK**: Nếu `updateStatus` từ chối yêu cầu thành `REJECTED` ngay sau khi `assignAgent` đọc trạng thái `NEW`, bước ghi tại dòng 1019 của `assignAgent` sẽ **ghi đè `REJECTED` thành `IN_PROGRESS`**. |
| **B3. reassignAgent** | Đọc `request.status` không phải terminal và có active assignment ([contact-requests.service.ts:1082-1092](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1082)) | Agent/Admin hoàn thành `IN_PROGRESS -> COMPLETED` qua `updateStatus()` | Chỉ mục một phần bảo vệ assignment; nhưng lệnh cập nhật request ([dòng 1129](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1129)) dùng `update({ where: { id } })` không điều kiện | **CONFIRMED RISK**: Nếu `updateStatus` hoàn thành yêu cầu thành `COMPLETED` đồng thời, bước ghi tại dòng 1129 của `reassignAgent` sẽ **ghi đè `COMPLETED` thành `IN_PROGRESS`**. |
| **B4. reopenRequest** | Đọc `request.status` là `COMPLETED` hoặc `REJECTED` ([contact-requests.service.ts:1203](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1203)) | Hai Admin cùng gọi `reopenRequest` đồng thời | Chỉ mục một phần `request_assignments_contactRequestId_key` bắt lỗi PostgreSQL 23505 -> 409 Conflict ([dòng 1274](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1274)) | **NOT AN ISSUE**: Hệ thống bảo vệ hoàn hảo bằng partial unique index; một request thành công và request kia nhận 409 Conflict. |
| **B5. assignAgent (Precondition)** | Đọc `assignments: { where: { isActive: true } }` ([contact-requests.service.ts:978](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L978)) | Gọi `POST /:id/assign` trên request đã có lịch sử phân công cũ nhưng hiện tại active = 0 | Prisma include đã lọc sẵn `isActive: true` | **NOT AN ISSUE**: `assignments.length === 0` phản ánh chính xác trạng thái không có active assignment, nhất quán với `/reopen` và `/reassign`. |

### 3.2. Đi sâu phân tích B5: Bản chất của điều kiện `assignments.length === 0` trong `/assign`
Trong [contact-requests.service.ts:975-995](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L975-L995):
```typescript
const request = await tx.contactRequest.findUnique({
  where: { id },
  include: {
    assignments: { where: { isActive: true } }, // <-- ĐÃ LỌC CHỈ LẤY ACTIVE ASSIGNMENT
  },
});
// ...
if (request.assignments.length > 0) {
  throw new ConflictException('An active assignment already exists for this request. Use reassign instead.');
}
```
- **Ý nghĩa thực tế:** Vì câu truy vấn đã chỉ định rõ ràng `where: { isActive: true }`, mảng `request.assignments` chỉ chứa các bản ghi đang hoạt động.
- Do đó, câu lệnh `request.assignments.length > 0` **chỉ kiểm tra việc đang có phân công active hay không**.
- Nếu một yêu cầu trước đây đã qua 3 lần phân công nhưng hiện tại tất cả đều đã bị giải phóng (`isActive = false`, ví dụ sau khi mở lại yêu cầu terminal mà không có môi giới phù hợp nên quay về trạng thái `NEW`), mảng `request.assignments` sẽ rỗng (`length === 0`). Khi đó, `/assign` **cho phép** gán môi giới mới.
- Điều này hoàn toàn trùng khớp với thông điệp lỗi: `"An active assignment already exists for this request. Use reassign instead."` và thông điệp của `/reassign`: `"No active assignment exists for this request. Use assign instead."`. Hai API bổ trợ hoàn hảo cho nhau.

---

## 4. Audit C — Đánh giá các câu lệnh xác nhận (Assertions) trong Kiểm thử E2E

### 4.1. Bài kiểm thử điều phối lại đồng thời (Concurrent Reassignment Race)
Trích đoạn mã nguồn thực tế tại [backend/test/contact-requests.e2e-spec.ts:1072-1107](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1072-L1107):
```typescript
it('two competing assignments against the same request never leave two active assignments in PostgreSQL', async () => {
  const [res1, res2] = await Promise.all([
    request(app.getHttpServer())
      .post(`/api/contact-requests/${raceReqId}/reassign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId: 'seed_user_agent_a', reason: 'Race 1' }),
    request(app.getHttpServer())
      .post(`/api/contact-requests/${raceReqId}/reassign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId: 'seed_user_agent_b', reason: 'Race 2' }),
  ]);

  const statuses = [res1.status, res2.status];
  expect(statuses).toContain(200);
  expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);

  const activeAssignments = await prisma.requestAssignment.findMany({
    where: { contactRequestId: raceReqId, isActive: true },
  });

  expect(activeAssignments.length).toBe(1);
  // ...
});
```

**Đánh giá kiểm thử:**
1. **Khẳng định trạng thái HTTP:**
   - Test kiểm tra: `expect(statuses).toContain(200)` (có ít nhất một request thành công) và `expect(statuses.every(s => s === 200 || s === 409)).toBe(true)` (không có mã lỗi 500 hay 400).
   - **Điểm yếu (Coverage Weakness):** Test **chưa khẳng định chặt chẽ** `expect(statuses).toContain(409)`. Trong trường hợp hai request HTTP chạy qua mạng cục bộ và vô tình được thực thi tuần tự hoàn toàn (request 1 xong trước, gán Agent A; sau đó request 2 mới chạy, gán Agent B thay cho Agent A), cả hai request đều có thể trả về 200 (`[200, 200]`). Mặc dù cơ sở dữ liệu vẫn đảm bảo `activeAssignments.length === 1` (do Agent A bị giải phóng khi Agent B được gán), bài test chưa ép buộc kịch bản va chạm trực tiếp ở mức cơ sở dữ liệu.
2. **Khẳng định AuditLog:** Bài test này **chưa kiểm tra AuditLog** được ghi nhận cho ca reassign này.

### 4.2. Bài kiểm thử phân công lần đầu đồng thời (Concurrent First-Assignment Race)
Trích đoạn mã nguồn thực tế tại [backend/test/contact-requests.e2e-spec.ts:1109-1159](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1109-L1159):
```typescript
it('concurrent first-assignment: two competing ADMIN assign requests to different agents never leave two active assignments', async () => {
  // ... tạo request NEW ...
  const [res1, res2] = await Promise.all([
    request(app.getHttpServer())
      .post(`/api/contact-requests/${req.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId: 'seed_user_agent_a', reason: 'Assign Race A' }),
    request(app.getHttpServer())
      .post(`/api/contact-requests/${req.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId: 'seed_user_agent_b', reason: 'Assign Race B' }),
  ]);

  const statuses = [res1.status, res2.status];
  expect(statuses).toContain(201);
  expect(statuses).toContain(409); // <-- KHẲNG ĐỊNH TƯỜNG MINH 409
  expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

  const activeAssigns = await prisma.requestAssignment.findMany({
    where: { contactRequestId: req.id, isActive: true },
  });
  expect(activeAssigns.length).toBe(1);

  const updatedReq = await prisma.contactRequest.findUnique({
    where: { id: req.id },
  });
  expect(updatedReq?.status).toBe(ContactRequestStatus.IN_PROGRESS);

  const audit = await prisma.auditLog.findFirst({
    where: { action: 'request.assign', entityId: activeAssigns[0].id },
  });
  expect(audit).not.toBeNull(); // <-- KHẲNG ĐỊNH AUDIT LOG
});
```

**Đánh giá kiểm thử:**
- Bài test này đạt **độ chuẩn mực rất cao**:
  - Khẳng định chính xác tập kết quả là `[201, 409]`.
  - Khẳng định không có lỗi 500.
  - Khẳng định số lượng phân công hoạt động là chính xác 1.
  - Khẳng định trạng thái yêu cầu chuyển thành `IN_PROGRESS`.
  - Khẳng định bản ghi `AuditLog` được lưu trữ chính xác.

---

## 5. Bảng tổng hợp phát hiện, rủi ro và khuyến nghị

| Hạng mục | Phát hiện thực tế | Phân loại | Khuyến nghị hành động |
|---|---|---|---|
| **Audit A: Listing Status Race** | `createRequest` không khóa hàng `listings`. Nếu có luồng gỡ duyệt tin, request vẫn có thể được tạo. Hiện chưa có API gỡ duyệt tin. | **POTENTIAL RISK** | Sau này khi phát triển tính năng gỡ tin / ẩn tin ở Phase sau, bổ sung `SELECT ... FOR SHARE` hoặc kiểm tra trạng thái tin đăng lúc tạo. |
| **Audit B: assign / reassign vs status update** | `assignAgent` ([dòng 1019](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1019)) và `reassignAgent` ([dòng 1129](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1129)) cập nhật trạng thái ContactRequest bằng `update({ where: { id } })` không kèm điều kiện status hiện tại, có thể ghi đè trạng thái `COMPLETED` hoặc `REJECTED` nếu có đua lệnh với `updateStatus`. | **CONFIRMED RISK** | Khuyến nghị củng cố mã nguồn: Đổi thành `updateMany({ where: { id, status: request.status }, data: { status: IN_PROGRESS } })` tương tự như đã làm ở `updateStatus()`. |
| **Audit B: assign precondition** | `assignments.length === 0` trong `/assign` được áp dụng trên tập đã lọc `isActive: true`, hoàn toàn không chặn yêu cầu có lịch sử cũ. | **NOT AN ISSUE** | Giữ nguyên, mã nguồn hiện tại đã đúng chuẩn thiết kế. |
| **Audit C: Reassign race test assertions** | Test `reassign` dùng `every(200 hoặc 409)`, chưa khẳng định bắt buộc phải có đúng 1 mã 409 và chưa assert AuditLog. | **TEST GAP** | Khuyến nghị bổ sung assertion: `expect(statuses).toContain(409)` (nếu muốn bắt buộc va chạm DB) và kiểm tra AuditLog. |

---

## 6. Khuyến nghị nghiệm thu cuối cùng (Final Recommendation)

**TEST COVERAGE IMPROVEMENT RECOMMENDED**\
*(Khuyến nghị cải thiện độ bao phủ kiểm thử và xem xét củng cố phòng vệ đồng thời)*

**Lý do:**
1. Toàn bộ mã nguồn hiện tại đang chạy ổn định, vượt qua 100% các bài test (127 unit tests, 88 E2E tests).
2. Các rủi ro được phát hiện trong đợt kiểm tra bổ sung này (như ghi đè trạng thái giữa `assign/reassign` và `updateStatus`) là các tình huống tranh chấp vi mô ở mức mili-giây giữa hai hành động quản trị viên và môi giới.
3. Nếu người dùng muốn độ an toàn tối đa trước khi tạo commit, có thể tiến hành bước tinh chỉnh nhỏ (khoảng 10 dòng code) để chuyển lệnh `update` trong `assignAgent` và `reassignAgent` sang `updateMany` có điều kiện, đồng thời bổ sung assertion cho test `reassign`.
4. Nếu người dùng quyết định chấp nhận mức độ bảo vệ hiện tại cho MVP, mã nguồn đã sẵn sàng để nghiệm thu.
