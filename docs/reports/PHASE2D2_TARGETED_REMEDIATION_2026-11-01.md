# BÁO CÁO KHẮC PHỤC TRỌNG TÂM — PHASE 2D-2: CONTACT REQUESTS & AGENT ASSIGNMENTS
**Thời gian lập báo cáo:** 2026-11-01\
**Mã dự án:** Batdongsan (NestJS 12, PostgreSQL 16 Native Windows, Prisma 7.10.1)\
**Nhánh Git:** `feat/phase2d2-contact-requests`\
**Base commit:** `0a355a7`\
**Tác giả:** Senior Backend Architect / AI Engineering Pair\

---

## 1. Tóm tắt điều hành (Executive Summary)

Báo cáo này ghi nhận toàn bộ quá trình và kết quả thực hiện đợt **Khắc phục Trọng tâm (Targeted Remediation)** cho module **Contact Requests & Agent Assignments (Phase 2D-2)** sau khi tiếp nhận các phát hiện từ hai cuộc kiểm toán trước đó:
- `docs/reports/PHASE2D2_FINAL_AUDIT_RECOVERY_2026-10-31.md`
- `docs/reports/PHASE2D2_SUPPLEMENTAL_CONCURRENCY_AUDIT_2026-10-31.md`
và đã được chuẩn hóa, đính chính các điểm mô tả kỹ thuật sau đợt đối soát chéo độc lập (Final Acceptance Cross-Check).

### Các kết quả then chốt:
1. **Khắc phục triệt để lỗi ghi đè trạng thái do tranh chấp đồng thời (Status-Overwrite Race Condition):**
   - Đã thay thế toàn bộ các lệnh cập nhật trạng thái vô điều kiện (`update`) trong `assignAgent()`, `reassignAgent()`, và `reopenRequest()` bằng kỹ thuật **Optimistic Conditional Update** (`updateMany`) có ràng buộc vị từ `status: request.status` (trạng thái đọc được tại thời điểm mở transaction).
   - Kiểm tra `count !== 1` để phát hiện xung đột tức thì, ném `ConflictException` (HTTP 409) và rollback 100% transaction, ngăn chặn việc vô tình ghi đè trạng thái `REJECTED` hoặc `COMPLETED`.
2. **Nâng cấp độ chặt chẽ của E2E Test cho Concurrent Reassignment:**
   - Cải tiến assertions để kiểm tra tính toàn vẹn đa tầng: xác minh chính xác `1` active assignment duy nhất tồn tại sau cuộc đua, toàn bộ lịch sử assignment được release chuẩn mực, và số lượng `AuditLog` hành động `request.reassign` khớp chính xác với số thao tác thành công (hỗ trợ cả kịch bản xung đột `[200, 409]` lẫn tuần tự hóa tự nhiên `[200, 200]`).
3. **Mở rộng phạm vi kiểm thử đơn vị (Unit Tests):**
   - Bổ sung các kịch bản xung đột đồng thời Scenario A (First assignment vs Rejection) và Scenario B (Reassignment vs Completion), cùng với các chuỗi tuần tự hóa hợp lệ ngược lại.
   - Số lượng Unit Tests tăng từ 127 tests (sau đợt review trước) lên **132 tests** (tất cả 132 tests đều pass, riêng module Contact Requests đạt 48/48 tests; mốc 116 tests là baseline ban đầu của Phase 2D-2).
4. **Bảo toàn dữ liệu (Database Fingerprint Verification):**
   - Đã kiểm tra fingerprint cơ sở dữ liệu bằng script `backend/check-db-fingerprint.mjs` của người dùng cả trước và sau khi chạy E2E suite thực tế trên PostgreSQL 16.
   - Kết quả trước và sau đồng nhất tuyệt đối về số lượng bản ghi: `{"listings":10,"shares":3,"contactRequests":2,"requestAssignments":3,"auditLogs":0,"users":5}`, chứng minh các fixture E2E dọn dẹp sạch sẽ dữ liệu sinh ra trong quá trình test. Cấu trúc chỉ mục được xác minh độc lập qua truy vấn hệ thống danh mục PostgreSQL `pg_indexes`.
5. **Đảm bảo quy tắc an toàn Git:**
   - Không thực hiện bất kỳ lệnh `git commit`, `git push`, chuyển nhánh, `git reset`, hay thao tác phá hủy database nào. Toàn bộ các thay đổi staged và unstaged của người dùng được giữ nguyên vẹn.

---

## 2. Tình trạng khôi phục sau gián đoạn (Recovery Status)

Quá trình thực thi trước đó bị gián đoạn do sự cố mất kết nối mạng. Ngay sau khi kết nối được khôi phục, tác vụ được tiếp tục theo chế độ **RESUME** dựa trên việc thanh tra thực tế cây làm việc:

- **Các hạng mục đã hoàn thành trước khi gián đoạn:**
  - Logic conditional update trong `assignAgent()` tại [contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1024-L1038).
  - Logic conditional update trong `reassignAgent()` tại [contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1140-L1154).
  - Logic conditional update trong `reopenRequest()` tại [contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1266-L1280).
  - Khung kiểm thử đồng thời E2E cải tiến trong [contact-requests.e2e-spec.ts](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1084-L1129).
  - Các ca kiểm thử đơn vị ban đầu cho xung đột trạng thái.
- **Các hạng mục được xử lý và hoàn tất sau khi khôi phục:**
  - Phát hiện và tinh chỉnh thiết lập fixture trong test `Scenario B (opposite serialization)` tại [contact-requests.spec.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.spec.ts#L1170-L1180): đảm bảo request được assign một Agent ban đầu trước khi gọi `reassignAgent`, giúp mock store phản ánh đúng logic nghiệp vụ thực tế.
  - Chạy toàn bộ bộ kiểm thử đơn vị: 132/132 passed.
  - Chạy build dự án: `npm run build` thành công, 0 lỗi.
  - Chạy kiểm tra cú pháp và quy chuẩn mã: `npm run lint` đạt 0 cảnh báo, 0 lỗi trên 49 tệp.
  - Kiểm tra database fingerprint trước khi chạy E2E: khớp 100% baseline.
  - Chạy toàn bộ bộ kiểm thử tích hợp thực tế (E2E) trên PostgreSQL: 88/88 passed.
  - Kiểm tra database fingerprint sau khi chạy E2E: khớp 100% baseline.
  - Lập báo cáo khắc phục trọng tâm đầy đủ và kiểm tra trạng thái Git cuối cùng.

---

## 3. Trạng thái Git ban đầu (Initial Git State)

```text
Branch: feat/phase2d2-contact-requests
Base commit: 0a355a7 feat(mls): implement internal mls sharing lifecycle and approved disclosure allowlists
Tracking: origin/feat/phase2d2-contact-requests
Working directory: D:\Batdongsan
```

Toàn bộ các tệp đã staged trước đó cùng các tệp mới được tạo của Phase 2D-2 được duy trì nguyên vẹn, không xảy ra xung đột hay mất mát dữ liệu.

---

## 4. Chi tiết thay đổi trong `assignAgent()`

- **Tệp nguồn:** [backend/src/contact-requests/contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1024-L1038)
- **Phương thức:** `assignAgent(id: string, user: AuthenticatedUser, dto: AssignAgentDto)`
- **Vấn đề trước khắc phục:**\
  Sau khi tìm được Agent phù hợp và tạo bản ghi `RequestAssignment`, dịch vụ thực thi cập nhật vô điều kiện:
  ```typescript
  await tx.contactRequest.update({
    where: { id },
    data: { status: targetStatus },
  });
  ```
  Nếu trong lúc tìm Agent hoặc trước khi commit, một thao tác khác chuyển request sang `REJECTED` (hoặc `COMPLETED`), câu lệnh trên sẽ ghi đè trạng thái thành `IN_PROGRESS`, làm sai lệch quy trình xử lý yêu cầu.

- **Giải pháp khắc phục đã triển khai:**
  ```typescript
  const statusUpdate = await tx.contactRequest.updateMany({
    where: {
      id,
      status: request.status,
    },
    data: {
      status: targetStatus,
    },
  });

  if (statusUpdate.count !== 1) {
    throw new ConflictException(
      'Contact request was modified concurrently. Please reload and retry.',
    );
  }
  ```
- **Cơ chế bảo vệ:**
  - Vị từ `status: request.status` (giá trị trạng thái đọc được tại thời điểm bắt đầu transaction, ví dụ `NEW`) được gửi xuống PostgreSQL.
  - Dưới cơ chế cô lập `READ COMMITTED` của PostgreSQL, nếu một transaction khác đã commit thay đổi trạng thái của row đó, câu lệnh `UPDATE` sẽ thấy row mới với trạng thái không còn khớp điều kiện `WHERE`, dẫn đến `statusUpdate.count === 0`.
  - Dịch vụ lập tức ném `ConflictException` (HTTP 409).
  - Toàn bộ transaction bị rollback: bản ghi `RequestAssignment` vừa tạo bị hủy bỏ, không có bản ghi `AuditLog` nào được commit.

---

## 5. Chi tiết thay đổi trong `reassignAgent()`

- **Tệp nguồn:** [backend/src/contact-requests/contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1140-L1154)
- **Phương thức:** `reassignAgent(id: string, user: AuthenticatedUser, dto: ReassignAgentDto)`
- **Vấn đề trước khắc phục:**\
  Tương tự `assignAgent()`, việc cập nhật trạng thái `IN_PROGRESS` không có điều kiện bảo vệ đối với trạng thái hiện thời của request.

- **Giải pháp khắc phục đã triển khai:**
  ```typescript
  const statusUpdate = await tx.contactRequest.updateMany({
    where: {
      id,
      status: request.status,
    },
    data: {
      status: ContactRequestStatus.IN_PROGRESS,
    },
  });

  if (statusUpdate.count !== 1) {
    throw new ConflictException(
      'Contact request was modified concurrently. Please reload and retry.',
    );
  }
  ```
- **Phân tích tách biệt 2 mối quan ngại đồng thời:**
  1. **Reassignment vs Terminal Status (COMPLETED / REJECTED):**\
     Bảo vệ bởi điều kiện `where: { id, status: request.status }`. Nếu request đã bị đóng hoặc từ chối, `count === 0`, ném HTTP 409 và rollback toàn bộ, không release Agent cũ vô cớ và không tạo Agent mới.
  2. **Reassignment vs Reassignment đồng thời:**\
     Điều kiện `status: IN_PROGRESS` không thể phân biệt giữa 2 thao tác reassign cùng diễn ra khi request vốn đang `IN_PROGRESS`. Tuy nhiên, tầng cơ sở dữ liệu được bảo vệ an toàn bởi chỉ mục duy nhất một phần thực tế trong PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX "request_assignments_contactRequestId_key"
     ON public.request_assignments USING btree ("contactRequestId")
     WHERE ("isActive" = true);
     ```
     Khi hai transaction cùng cố gắng tạo assignment mới với `isActive: true`, PostgreSQL sẽ cưỡng chế tính duy nhất. Transaction thứ hai sẽ gặp lỗi vi phạm Unique Constraint (`P2002` trong Prisma / mã lỗi PostgreSQL `23505`), tự động rollback và không thể tạo hai active assignment song song.

---

## 6. Tái thẩm định và Khắc phục cho `reopenRequest()`

- **Tệp nguồn:** [backend/src/contact-requests/contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L1266-L1280)
- **Phương thức:** `reopenRequest(id: string, user: AuthenticatedUser, dto: ReopenContactRequestDto)`
- **Phân tích nguy cơ:**\
  Khi ADMIN thực hiện mở lại một yêu cầu đã đóng (`COMPLETED` hoặc `REJECTED`), hệ thống cố gắng tìm một Agent tự động.
  - Trường hợp 1: Có Agent đủ điều kiện -> Request chuyển thành `IN_PROGRESS` và tạo một active `RequestAssignment`. Trường hợp này partial unique index có hiệu lực.
  - Trường hợp 2: Không có Agent nào đủ điều kiện -> Request chuyển thành `NEW` và **không có bản ghi active assignment nào được tạo**.
  Trong Trường hợp 2, partial unique index hoàn toàn không được kích hoạt! Nếu hai ADMIN cùng bấm Reopen đồng thời, cả hai thao tác đều có thể lọt qua nếu dùng `update` vô điều kiện.
- **Giải pháp khắc phục đã triển khai:**
  ```typescript
  const reopenUpdate = await tx.contactRequest.updateMany({
    where: {
      id,
      status: request.status,
    },
    data: {
      status: newStatus,
    },
  });

  if (reopenUpdate.count !== 1) {
    throw new ConflictException(
      'Contact request was modified concurrently. Please reload and retry.',
    );
  }
  ```
- **Kết quả:**\
  Bảo đảm chỉ duy nhất một lệnh reopen thành công chuyển đổi từ trạng thái terminal cũ (`COMPLETED`/`REJECTED`). Thao tác cạnh tranh đến sau sẽ thấy `count === 0`, nhận HTTP 409 và bị hủy bỏ toàn bộ.

---

## 7. Hành vi Cập nhật có Điều kiện và Ngữ nghĩa HTTP 409

- **Cơ chế hoạt động:** Kỹ thuật Optimistic Concurrency Control sử dụng chính cột `status` hiện tại làm token kiểm tra tính hợp lệ. Không cần thêm cột `version` hay thay đổi Prisma schema.
- **Tính nhất quán REST:** Xung đột tài nguyên do sửa đổi đồng thời được chuẩn hóa thành mã lỗi HTTP `409 Conflict`, kèm thông báo rõ ràng cho client: `"Contact request was modified concurrently. Please reload and retry."`. Điều này thay thế hoàn toàn nguy cơ phát sinh lỗi không kiểm soát (HTTP 500) hoặc ghi đè dữ liệu âm thầm.

---

## 8. Rollback Transaction và Tính Nhất quán của AuditLog

Toàn bộ các thao tác nghiệp vụ phức tạp đều được bao bọc trong `prisma.$transaction(async (tx) => { ... })`:
1. Mọi câu lệnh insert/update bảng `request_assignments` diễn ra bên trong transaction context `tx`.
2. Lệnh ghi log kiểm toán `tx.auditLog.create(...)` cũng nằm trong `tx`.
3. Khi câu lệnh `updateMany` ném `ConflictException`, hoặc khi PostgreSQL báo vi phạm unique constraint `P2002`, Prisma lập tức phát lệnh `ROLLBACK` đến PostgreSQL.
4. **Cam kết:** Không có bất kỳ assignment thừa nào tồn tại, không có assignment cũ nào bị ngắt kết nối mà không có người thay thế, và không có bản ghi `AuditLog` mồ côi nào được lưu lại trong cơ sở dữ liệu.

---

## 9. Danh mục Kiểm thử Đơn vị (Unit Tests)

Bộ kiểm thử đơn vị tại [backend/src/contact-requests/contact-requests.spec.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.spec.ts) đã được mở rộng toàn diện (đạt **48 tests** riêng cho module):

| Nhóm kiểm thử | Số ca test | Mục tiêu kiểm tra |
| :--- | :---: | :--- |
| **DTO Validation** | 6 | Kiểm tra tính chặt chẽ của Create, Query, Assign, Reassign, Reopen, Status DTOs |
| **Automatic Assignment Policy** | 8 | Thuật toán gán Agent tự động, ưu tiên Listing Owner, fallback, và phân quyền xem |
| **Privacy & Allowlist Projections** | 6 | Lọc thông tin nhạy cảm của Buyer/Agent theo đúng vai trò người yêu cầu |
| **Status Transition Matrix** | 10 | Kiểm tra ma trận chuyển trạng thái hợp lệ/bất hợp lệ và quyền hạn của từng Role |
| **Assignments & Reassignment** | 18 | Kiểm tra logic gán, gán lại, mở lại, và các kịch bản xung đột đồng thời |

### Các ca kiểm thử xung đột trọng tâm được bổ sung:
- `Scenario A: assignAgent fails with 409 Conflict if request status changed concurrently after read (e.g. to REJECTED)`
- `Scenario B: reassignAgent fails with 409 Conflict if request status changed concurrently after read (e.g. to COMPLETED)`
- `reopenRequest fails with 409 Conflict if request status changed concurrently after read`
- `Scenario A (opposite serialization): if assignAgent wins first, request becomes IN_PROGRESS and subsequent status transitions follow matrix`
- `Scenario B (opposite serialization): if reassignAgent wins first, new active agent can complete the request`

---

## 10. Chiến lược Kiểm thử E2E Cho Concurrent Reassignment và Các Bất Biến

- **Tệp kiểm thử:** [backend/test/contact-requests.e2e-spec.ts](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1072-L1129)
- **Tên ca kiểm thử:** `two competing assignments against the same request never leave two active assignments in PostgreSQL`
- **Mã kiểm thử thực tế:**
  ```typescript
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

  const successCount = statuses.filter((s) => s === 200).length;
  expect([1, 2]).toContain(successCount);

  // Bất biến 1: Chỉ duy nhất 1 active assignment trong PostgreSQL
  const activeAssignments = await prisma.requestAssignment.findMany({
    where: { contactRequestId: raceReqId, isActive: true },
  });
  expect(activeAssignments.length).toBe(1);

  // Bất biến 2: Tổng số bản ghi assignment = 1 (ban đầu) + successCount
  const allRaceAssigns = await prisma.requestAssignment.findMany({
    where: { contactRequestId: raceReqId },
  });
  expect(allRaceAssigns.length).toBe(1 + successCount);

  // Bất biến 3: Toàn bộ assignment đã release phải có releasedAt
  const releasedAssigns = allRaceAssigns.filter((a) => !a.isActive);
  expect(releasedAssigns.length).toBe(successCount);
  for (const rel of releasedAssigns) {
    expect(rel.releasedAt).not.toBeNull();
  }

  // Bất biến 4: Số lượng AuditLog request.reassign khớp chính xác với successCount
  const reassignAudits = await prisma.auditLog.findMany({
    where: {
      action: 'request.reassign',
      entityType: 'RequestAssignment',
      entityId: { in: allRaceAssigns.map((a) => a.id) },
    },
  });
  expect(reassignAudits.length).toBe(successCount);
  ```
- **Ý nghĩa kỹ thuật:**\
  Ca kiểm thử này không giả định hoặc khẳng định rằng `Promise.all()` luôn luôn tạo ra transaction chồng lấn (overlapping) tuyệt đối tại tầng database. Thay vào đó, bài test xác minh tính bất biến của cơ sở dữ liệu (**Database Invariants**) cho cả hai trường hợp kết quả hợp lệ:
  1. Nếu có tranh chấp thực sự tại PostgreSQL: Một lệnh thành công (200), lệnh cạnh tranh nhận 409 Conflict.
  2. Nếu hệ thống tuần tự hóa tự nhiên (Sequential execution): Cả hai lệnh lần lượt thành công (200, 200).
  Trong cả hai kịch bản, các bất biến dữ liệu đều được khẳng định chắc chắn: không bao giờ tồn tại 2 active assignment cùng lúc, toàn bộ assignment bị thay thế đều có `releasedAt`, và số lượng log kiểm toán khớp chính xác với số lần commit thành công.

---

## 11. Kết quả E2E Cho Concurrent First-Assignment và Phân biệt Quy trình Nghiệp vụ

### Phân biệt rõ hai quy trình nghiệp vụ:
1. **Phân công tự động khi tạo yêu cầu (Automatic assignment during request creation):**\
   Người mua (`BUYER`) gửi yêu cầu qua `POST /api/contact-requests`. Dịch vụ áp dụng chính sách phân công môi giới tự động (deterministic selection policy). Nếu tìm thấy Agent đủ điều kiện, yêu cầu được tạo ở trạng thái `IN_PROGRESS` kèm active assignment; nếu không, trạng thái là `NEW` (không có active assignment).
2. **Phân công lần đầu cạnh tranh đồng thời bởi ADMIN (Concurrent first-assignment by ADMIN):**\
   Yêu cầu đã tồn tại ở trạng thái `NEW` (chưa có Agent). Hai yêu cầu quản trị viên cạnh tranh đồng thời gọi `POST /api/contact-requests/:id/assign` trên **cùng một ContactRequest ID** để gán cho hai Agent khác nhau.

### Ca kiểm thử Concurrent First-Assignment thực tế:
- **Tệp:** [backend/test/contact-requests.e2e-spec.ts](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1131-L1181)
- **Tên ca test:** `concurrent first-assignment: two competing ADMIN assign requests to different agents never leave two active assignments`
- **Mã kiểm thử thực tế:**
  ```typescript
  const req = await prisma.contactRequest.create({
    data: {
      listingId: testListingApprovedId,
      buyerId: 'seed_user_buyer_01',
      contactConsent: true,
      status: ContactRequestStatus.NEW,
    },
  });
  createdRequestIds.push(req.id);

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
  ```
- **Kết quả xác nhận:**
  - `statuses` nhận chính xác: một phản hồi **HTTP 201** và một phản hồi **HTTP 409**.
  - Không có phản hồi HTTP 500 nào xảy ra.
  - Số lượng active assignment trong PostgreSQL: đúng **1 bản ghi duy nhất** (bảo vệ bởi chỉ mục `request_assignments_contactRequestId_key`).
  - Trạng thái yêu cầu chuyển thành `IN_PROGRESS`.
  - Bản ghi `AuditLog` với `action: 'request.assign'` được lưu thành công tương ứng với assignment chiến thắng.

---

## 12. Độ Bao phủ Xung đột Trạng thái và Phân bổ (Status-vs-Assignment)

Đã thẩm định và kiểm thử đầy đủ 2 kịch bản xung đột chéo tại tầng đơn vị:
1. **Scenario A — Gán lần đầu đấu với Từ chối (First assignment vs Rejection):**
   - Nếu lệnh từ chối (Reject) commit trước: Lệnh gán (Assign) nhận `count === 0` từ `updateMany`, trả về HTTP 409. Request giữ nguyên trạng thái `REJECTED`, không gán Agent, không ghi log kiểm toán.
   - Nếu lệnh gán commit trước (Tuần tự hóa ngược): Request trở thành `IN_PROGRESS`. Sau đó lệnh chuyển về `NEW` sẽ bị từ chối (HTTP 400), nhưng lệnh chuyển sang `REJECTED` từ `IN_PROGRESS` thành công theo đúng ma trận trạng thái.
2. **Scenario B — Gán lại đấu với Hoàn tất (Reassignment vs Completion):**
   - Nếu lệnh hoàn tất (Complete) commit trước: Lệnh gán lại (Reassign) nhận `count === 0` từ `updateMany`, trả về HTTP 409. Request giữ nguyên trạng thái `COMPLETED`, Agent cũ không bị thay thế, không ghi log gán lại.
   - Nếu lệnh gán lại commit trước (Tuần tự hóa ngược): Request giữ trạng thái `IN_PROGRESS` với Agent mới. Agent cũ bị ngắt quyền (nếu cố tình thao tác sẽ nhận HTTP 403 Forbidden). Agent mới có thể hoàn tất yêu cầu thành công (HTTP 200).

---

## 13. Kết quả Thực thi Các Lệnh Kiểm tra (Verification Results)

| Lệnh thực thi | Mục tiêu | Kết quả thực tế | Mã thoát (Exit Code) |
| :--- | :--- | :--- | :---: |
| `npm test` | Kiểm thử đơn vị toàn bộ backend | **132/132 passed** (5 files: mls 39, app 1, contact-requests 48, listings 28, auth 16) | **0** |
| `npm run build` | Biên dịch TypeScript & NestJS | **Thành công** (`nest build` hoàn tất không lỗi) | **0** |
| `npm run lint` | Kiểm tra quy chuẩn mã nguồn | **0 warnings, 0 errors** (quét trên 49 tệp bằng oxlint) | **0** |
| `node .\check-db-fingerprint.mjs` (Pre-E2E) | Kiểm tra toàn vẹn DB trước E2E | Khớp 100% baseline gốc | **0** |
| `npm run test:e2e` | Kiểm thử tích hợp thực tế trên PostgreSQL | **88/88 passed** (4 files: listings 15, contact-requests 40, mls 32, app 1) | **0** |
| `node .\check-db-fingerprint.mjs` (Post-E2E) | Kiểm tra toàn vẹn DB sau E2E | Khớp 100% baseline gốc | **0** |

---

## 14. Đối chiếu Fingerprint Cơ sở Dữ liệu Trước và Sau và Giới hạn Kỹ thuật

Chạy script kiểm tra độc lập `backend/check-db-fingerprint.mjs`:

```json
{
  "listings": 10,
  "shares": 3,
  "contactRequests": 2,
  "requestAssignments": 3,
  "auditLogs": 0,
  "users": 5
}
```

- **Trước khi chạy E2E:**\
  `DB_FINGERPRINT: {"listings":10,"shares":3,"contactRequests":2,"requestAssignments":3,"auditLogs":0,"users":5}`
- **Sau khi chạy E2E:**\
  `DB_FINGERPRINT: {"listings":10,"shares":3,"contactRequests":2,"requestAssignments":3,"auditLogs":0,"users":5}`

### Ý nghĩa và Giới hạn kỹ thuật của Fingerprint:
1. **Ý nghĩa chứng minh:** Sự đồng nhất tuyệt đối của 6 chỉ số đếm số lượng dòng trước và sau khi thực thi 88 ca test E2E thực tế chứng minh vững chắc rằng các fixture E2E đã dọn dẹp sạch sẽ toàn bộ các bản ghi do bài test sinh ra, không gây ô nhiễm (pollution) dữ liệu cho database phát triển.
2. **Giới hạn kỹ thuật:** Số lượng bản ghi (row counts) đồng nhất tự nó không chứng minh rằng từng trường dữ liệu trong các bản ghi ban đầu hoàn toàn không bị biến đổi giá trị. Việc bảo toàn cấu trúc bảng và chỉ mục được kiểm chứng độc lập thông qua truy vấn danh mục hệ thống `pg_indexes`.

---

## 15. Bằng chứng Xử lý Xung đột Chỉ mục Prisma (`isAssignmentUniqueConflict`)

Chỉ mục duy nhất một phần thực tế trong PostgreSQL được định nghĩa:
```sql
CREATE UNIQUE INDEX "request_assignments_contactRequestId_key"
ON public.request_assignments USING btree ("contactRequestId")
WHERE ("isActive" = true);
```

### Phân tích bằng chứng xử lý lỗi:
1. **Kiểm tra tĩnh (Static Inspection):**\
   Hàm `isAssignmentUniqueConflict()` trong [contact-requests.service.ts](file:///D:/Batdongsan/backend/src/contact-requests/contact-requests.service.ts#L26-L75) hỗ trợ bắt đúng tên định danh chỉ mục `request_assignments_contactRequestId_key` trên cả:
   - `err?.cause?.constraint?.index` (cấu trúc của `@prisma/adapter-pg` với PostgreSQL error 23505).
   - `err?.meta?.target` (cấu trúc lỗi tiêu chuẩn của Prisma engine).
   - `err?.cause?.originalMessage` và `err?.message` (thông điệp lỗi raw).
2. **Hành vi quan sát được trong kiểm thử E2E:**\
   Trong ca kiểm thử concurrent first-assignment trên cơ sở dữ liệu thật PostgreSQL 16 ([contact-requests.e2e-spec.ts](file:///D:/Batdongsan/backend/test/contact-requests.e2e-spec.ts#L1131-L1181)), request thứ hai nhận chính xác mã lỗi **HTTP 409 Conflict** (không phải HTTP 500). Điều này chứng minh trên thực tế rằng lỗi xung đột duy nhất do PostgreSQL trả về được dịch chuyển thành công thành `ConflictException`.
3. **Phân định giới hạn:**\
   Bằng chứng kiểm thử khẳng định hành vi REST API đầu cuối trả về 409. Không có khẳng định suy đoán nào về các nhánh cấu trúc lỗi raw chưa được kích hoạt trong kịch bản test cụ thể.

---

## 16. Lịch sử Số lượng Kiểm thử Đơn vị qua các Giai đoạn

| Giai đoạn | Số lượng Unit Tests | Ghi chú lịch sử |
|---|---:|---|
| **Triển khai ban đầu** | 116 | 84 tests nền tảng + 32 tests Contact Requests đầu tiên |
| **Sau đợt Review ban đầu** | 127 | Bổ sung 11 tests cho Contact Requests (32 -> 43) |
| **Sau Targeted Remediation (Hiện tại)** | **132** | Bổ sung 5 tests kịch bản xung đột đồng thời (43 -> 48) |

- Con số **132 unit tests** là kết quả đo kiểm thực tế mới nhất, với toàn bộ 48/48 tests của module Contact Requests đều vượt qua.

---

## 17. Danh sách Các Tệp Thay đổi Trong Đợt Khắc phục Này

Chỉ có 3 tệp mã nguồn/kiểm thử được điều chỉnh cục bộ trong đợt remediation này, cùng các tệp báo cáo:
1. `backend/src/contact-requests/contact-requests.service.ts`: Triển khai conditional update cho `assignAgent()`, `reassignAgent()`, và `reopenRequest()`.
2. `backend/src/contact-requests/contact-requests.spec.ts`: Bổ sung các unit test mô phỏng xung đột đồng thời và ma trận trạng thái.
3. `backend/test/contact-requests.e2e-spec.ts`: Nâng cấp assertions kiểm tra tính bất biến cho concurrent reassignment E2E test.
4. `docs/reports/PHASE2D2_TARGETED_REMEDIATION_2026-11-01.md`: Báo cáo remediation này (đã được đính chính hoàn thiện).
5. `docs/reports/PHASE2D2_DOCUMENTATION_CORRECTIONS_2026-11-01.md`: Biên bản ghi nhận đính chính tài liệu độc lập.

---

## 18. Rủi ro Còn lại và Các Tính năng Hoãn lại (Remaining Risks & Deferred Features)

1. **Cơ chế phân bổ Round-Robin nâng cao:**\
   Thuật toán phân bổ tự động hiện tại lựa chọn deterministic Agent đầu tiên thỏa mãn tiêu chí (`createdAt: 'asc'`). Logic xoay vòng (round-robin) theo tải trọng thực tế của từng Agent được thiết kế hoãn lại cho các giai đoạn nâng cao tiếp theo.
2. **Cấp độ cô lập giao dịch PostgreSQL:**\
   Giải pháp `updateMany` điều kiện hóa đã chứng minh tính hiệu quả vượt trội ở cấp độ cô lập mặc định `READ COMMITTED`. Nếu hệ thống trong tương lai chuyển sang `SERIALIZABLE`, cần bổ sung cơ chế retry cho các lỗi serialization failure (`40001`).

---

## 19. Đính chính Tài liệu Sau Đợt Đối soát Chéo Nghiệm thu (Documentation Corrections Following Final Acceptance Cross-Check)

Phần này ghi nhận chính thức các điểm điều chỉnh trong tài liệu báo cáo sau đợt đối soát chéo độc lập (Final Acceptance Cross-Check):
1. **Đính chính tên chỉ mục vật lý PostgreSQL:**\
   Tên chỉ mục thực tế được xác nhận là `"request_assignments_contactRequestId_key"` với điều kiện `WHERE ("isActive" = true)`, thay cho tên gọi quy ước mô tả `idx_request_assignments_active`. Bảng `request_assignments` sử dụng các cột camelCase có dấu ngoặc kép do Prisma ánh xạ từ model.
2. **Đính chính mô tả test Concurrent First-Assignment:**\
   Sửa chữa đoạn văn bản mô tả nhầm lẫn trước đây thành mô tả chính xác của ca test trong code: hai yêu cầu ADMIN `/assign` cạnh tranh trên cùng một ContactRequest ID (chứ không phải tạo hai contact request trên cùng listing). Phân biệt rành mạch với quy trình phân công tự động khi tạo yêu cầu.
3. **Làm rõ ngữ nghĩa E2E Concurrent Reassignment:**\
   Ghi nhận rõ ràng rằng bài test E2E kiểm tra tính bất biến của cơ sở dữ liệu cho cả hai kịch bản `[200, 409]` và `[200, 200]`, không tuyên bố quá mức rằng `Promise.all()` luôn luôn ép được transaction chồng lấn.
4. **Làm rõ giới hạn của Database Fingerprint:**\
   Xác định rõ fingerprint kiểm tra số lượng dòng của 6 bảng để chứng minh việc dọn dẹp fixture, kết hợp truy vấn hệ thống danh mục `pg_indexes` để bảo đảm cấu trúc chỉ mục.
5. **Chuẩn hóa lịch sử số lượng Unit Test:**\
   Giải trình đầy đủ lộ trình tăng số lượng test từ 116 (ban đầu) -> 127 (sau review) -> 132 (hiện tại sau remediation).

*Toàn bộ các điều chỉnh trên hoàn toàn thuộc phạm vi tài liệu và báo cáo kỹ thuật. Mã nguồn ứng dụng, ma trận nghiệp vụ, cơ sở dữ liệu và các bộ kiểm thử tự động đều đã đạt trạng thái sẵn sàng và đã được xác minh toàn diện.*

---

## 20. Khuyến nghị Nghiệm thu Cuối cùng (Final Recommendation)

# DOCUMENTATION CORRECTED — READY FOR USER ACCEPTANCE
