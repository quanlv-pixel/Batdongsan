# BÁO CÁO PHASE 2B + 2C: AUTH & LISTINGS BACKEND — XÁC MINH VÀ CHUẨN BỊ CHECKPOINT

- **Dự án:** Batdongsan
- **Nhánh:** `feat/phase2c-listings` (tạo từ `feat/phase2b-auth`; Phase 2B và 2C cùng nằm trong working tree, **chưa commit**)
- **Database:** PostgreSQL 16 cài trực tiếp trên Windows (`postgresql-x64-16`, `localhost:5432`, DB `batdongsan`). Không dùng Docker.
- **Schema/migration:** Không thay đổi. `prisma migrate status`: 1 migration, "Database schema is up to date!" (đã chạy ngày 27/10).

---

## 1. Lịch sử thực hiện

| Lượt | Thời điểm (27/10/2026) | Nội dung |
| :--- | :--- | :--- |
| Lượt 1 | ~22:40–23:12 | Triển khai các endpoint Listings; `JwtAuthGuard` kiểm tra `isActive`; 41 unit test + 10 e2e test đạt |
| Lượt 2 | ~23:15–23:30 | Rà soát kỹ và sửa lỗi (env, PATCH atomic, test hồi quy). **Bị ngắt** vì ổ C hết dung lượng (`ENOSPC`) rồi mất mạng; lần `npm test` cuối: 44/45 (1 FAIL) |
| Lượt 3 | 27/10/2026 23:37–23:42 | Khôi phục tiến độ, sửa lỗi secret guard, thêm test đồng thời trên DB thật |
| Lượt 4 | 28/10/2026 11:20–11:26 | Khôi phục sau sự cố ngắt kết nối, tái xác minh toàn bộ: 45/45 unit tests PASS, 14/14 e2e tests PASS (kèm kiểm tra tương tranh & cách ly DB thật), build PASS, lint PASS (29 files), git diff --check sạch |

> [!WARNING]
> Ở lượt 2, ổ C còn 0 GB nên đã chạy `npm cache clean --force` (chỉ xóa cache npm của người dùng, không đụng vào repo). Hiện ổ C còn khoảng 4,17 GB; nếu đầy lại, các lần chạy npm/vitest sau có thể bị lỗi.

---

## 2. Phát hiện và sửa chữa

| # | Hạng mục | Phát hiện | Sửa chữa | File |
| :--- | :--- | :--- | :--- | :--- |
| 1 | JWT dùng user và role hiện tại trong DB | Guard tải user từ PostgreSQL và gán `role` lấy từ DB, nên token cũ không giữ được quyền sau khi bị hạ role. Trước đây guard verify bằng `process.env.JWT_SECRET`, còn `AuthService` ký bằng secret cấu hình trong `JwtModule`, tức có **hai nguồn secret**. Đây là nguyên nhân khiến test hạ quyền FAIL ở lượt 2 | Guard chỉ dùng `jwtService.verifyAsync(token)` với secret của `JwtModule` (một nguồn duy nhất). Test ký token bằng đúng secret của test module | `src/auth/guards/jwt-auth.guard.ts`, `src/auth/auth.spec.ts` |
| 2 | Từ chối user không tồn tại hoặc bị khóa | Đã có từ lượt 1 | — | `jwt-auth.guard.ts` |
| 3 | PATCH phải atomic khi ghi | Code cũ đọc trạng thái rồi `update({where:{id}})` ⇒ một lệnh PATCH đang chờ vẫn có thể ghi đè tin vừa chuyển sang PENDING | Bọc trong `$transaction`, ghi bằng `updateMany` có điều kiện `status IN (DRAFT, REJECTED)` và `ownerId` (nếu không phải ADMIN). Nếu 0 dòng được cập nhật ⇒ `409`. Vẫn giữ kiểm tra `rentalPeriod` trên trạng thái sau khi sửa | `src/listings/listings.service.ts` |
| 4 | Moderation atomic | `$transaction` + `updateMany` có điều kiện `status = PENDING` + tạo `ModerationLog` với `fromStatus` thật. Không cần sửa | — | `listings.service.ts` |
| 5 | Allowlist cho endpoint công khai | List/detail dùng `select` tường minh; quan hệ lồng nhau `images` chỉ lấy `id, url, order`. Không có `streetAddress`, `latitude`, `longitude`, `owner`, `moderationLogs` | — (đã thêm test xác minh) | `listings.service.ts` |
| 6 | Nạp biến môi trường | Lệnh `process.loadEnvFile('.env')` nằm rải rác (PrismaService, test e2e), phụ thuộc thư mục đang chạy (cwd); có secret mặc định ghi cứng trong code | Thêm `initEnvironment()` dùng chung: tìm `backend/.env` theo vị trí module (không theo cwd), giữ nguyên biến môi trường đã có sẵn, báo lỗi rõ ràng nếu thiếu `DATABASE_URL`/`JWT_SECRET`. Đã bỏ secret mặc định | `src/config/env.config.ts` (mới), `src/main.ts`, `src/prisma/prisma.service.ts`, `src/auth/auth.module.ts` |
| 7 | Cách ly test trên DB thật | Test e2e cũ chỉ đọc dữ liệu và không có cơ chế dọn dẹp | Ghi nhận ID của mọi bản ghi do lượt test tạo ra (ghi nhận *trước* khi assert). `afterAll` chỉ xóa `ModerationLog` và `Listing` của các ID đó. Lấy "dấu vân tay" dữ liệu có sẵn (số dòng + `max(updatedAt)`) trước và sau khi chạy rồi so sánh | `test/listings.e2e-spec.ts` |

> [!NOTE]
> Không dùng `@nestjs/config` vì gói này chưa được cài, và việc cài thêm dependency nằm ngoài phạm vi nhiệm vụ. `initEnvironment()` dùng `process.loadEnvFile` có sẵn trong Node 24.

---

## 3. Bằng chứng kiểm tra (lượt 3)

| Lệnh | Loại | Kết quả |
| :--- | :--- | :--- |
| `npm test` | Unit test, Prisma được **mock** | **PASS**: 45/45 (app 1, auth 16, listings 28) |
| `npm run test:e2e` | HTTP + **PostgreSQL thật** | **PASS**: 14/14 (app 1, listings 13) |
| `npm run build` | Biên dịch | **PASS** (exit 0); có `dist/config/env.config.js` nên đường dẫn `.env` vẫn đúng sau khi build |
| `npm run lint` | oxlint | **PASS**: 0 cảnh báo, 0 lỗi (29 file) |
| `git diff --check` | Khoảng trắng | **PASS** (chỉ có cảnh báo LF→CRLF ở `main.ts`, không phải lỗi) |
| Thứ tự ưu tiên env | Kiểm tra bằng lệnh | **PASS**: đặt `PORT=45678` trong shell, sau `loadEnvFile` giá trị vẫn là `45678` (biến có sẵn không bị `.env` ghi đè) |

### 3.1 Bảng bao phủ theo loại test

| Yêu cầu | Mock | DB thật | Đồng thời thật |
| :--- | :---: | :---: | :---: |
| Token cũ không giữ quyền sau khi hạ role | PASS | NOT RUN (*) | — |
| Từ chối user bị khóa dù token còn hạn | PASS | NOT RUN (*) | — |
| Guard tải user từ DB (seed owner/buyer/admin) | — | PASS | — |
| PATCH đua với chuyển sang PENDING ⇒ 409, dữ liệu không đổi | PASS | PASS | **PASS** |
| Hai quyết định kiểm duyệt cạnh tranh ⇒ đúng 1 thành công, đúng 1 log | PASS (tuần tự) | PASS | **PASS** |
| Rollback trạng thái khi tạo log thất bại | PASS (mô phỏng) | NOT RUN (**) | — |
| Allowlist cho list/detail, kể cả `images` lồng nhau | PASS | PASS | — |
| Detail của tin chưa APPROVED ⇒ 404 | PASS | PASS | — |
| Route `/mine` không bị `/:id` che | PASS | PASS | — |
| Trường cấm (`status`, `role`) ⇒ 400; BUYER tạo tin ⇒ 403 | — | PASS | — |

(*) Không chạy trên DB thật vì muốn kiểm tra thì phải hạ role hoặc khóa một user seed, tức là sửa dữ liệu có sẵn; nhiệm vụ cấm việc này. Muốn chạy thì cần một user test riêng, tạo ra rồi xóa trong cùng lượt test.
(**) Muốn kiểm tra rollback trên DB thật thì phải chủ động làm lỗi việc insert log (bằng trigger hoặc ràng buộc), tức là sửa schema; điều này bị cấm. Tính atomic ở đây dựa vào interactive transaction của Prisma.

**Cách làm test đồng thời thật:** một transaction riêng giữ khóa `SELECT … FOR UPDATE` trên tin do test tạo. Các request HTTP đi qua bước đọc, rồi bị chặn ở bước ghi. Sau đó nhả khóa (kèm việc đổi sang PENDING, nếu là kịch bản PATCH). Test PATCH có khả năng phân biệt: với code cũ (`update` theo `id`), lệnh PATCH sẽ ghi thành công sau khi nhả khóa, nên test sẽ FAIL.

### 3.2 Bằng chứng cách ly DB

```text
[isolation] run-created listings cleaned: 4;
baseline={"listings":10,"logs":1,"users":5,"listingsMaxUpdatedAt":"2026-10-24T17:03:30.885Z","usersMaxUpdatedAt":"2026-10-24T17:03:30.782Z"}
after   ={"listings":10,"logs":1,"users":5,"listingsMaxUpdatedAt":"2026-10-24T17:03:30.885Z","usersMaxUpdatedAt":"2026-10-24T17:03:30.782Z"}
```

Không có reset, reseed, truncate hay SQL phá hủy nào. Không sửa user hay listing seed nào.

---

## 4. npm audit (27/10, 23:41)

| Gói | Phiên bản đã cài | Đường phụ thuộc | Advisory | Cách khắc phục theo output |
| :--- | :--- | :--- | :--- | :--- |
| `body-parser` | 2.3.0 | `@nestjs/platform-express@12.2.0 → express@5.3.0 → body-parser@2.3.0` | GHSA-27r3-jxmh-p828 (DoS) | `npm audit fix` |
| `multer` | 2.4.0 | `@nestjs/platform-express@12.2.0 → multer@2.4.0` | GHSA-q7qp-rjg7-q26m (DoS) | `npm audit fix` |
| `@nestjs/platform-express` | 12.2.0 | trực tiếp; được `@nestjs/core@12.2.0` và `@nestjs/testing@12.2.0` dedupe dùng chung | phụ thuộc vào `multer` có lỗ hổng | `npm audit fix` |

**Tổng: 3 high.** Chưa áp dụng bản sửa nào.

**Vì sao trước là 5, nay là 3:** Lần audit ở Phase 2B liệt kê thêm `@nestjs/core >=12.0.1` và `@nestjs/testing >=12.0.1`, và lúc đó cách sửa duy nhất là `--force` (hạ `platform-express` xuống 11.1.1). Output hiện tại không còn hai mục này và báo có bản sửa không phá vỡ tương thích. Trong khoảng thời gian giữa hai lần audit, phiên làm việc này không chạy `npm install` hay thay đổi dependency nào. Vì vậy khả năng cao là dữ liệu advisory từ registry đã cập nhật khoảng phiên bản bị ảnh hưởng. Tuy nhiên chưa có bằng chứng trong repo chứng minh điều này, nên nguyên nhân được ghi là **chưa xác định (chỉ là suy đoán có cơ sở)**.

---

## 5. Hạn chế còn lại

1. Chưa kiểm tra trên DB thật các trường hợp hạ role, user bị khóa và rollback khi ghi log lỗi (xem mục 3.1).
2. Test đồng thời dùng `sleep(800ms)` để chờ request chạm tới bước ghi. Trên máy rất chậm, test có thể chập chờn.
3. Có 3 cảnh báo audit mức high, mới chỉ ghi nhận, chưa xử lý.
4. Ổ C còn ít dung lượng (khoảng 4 GB).
5. `getModerationHistory` (chỉ ADMIN gọi được) trả về email của moderator. Điều này chấp nhận được với quyền ADMIN, nhưng nên xem lại ở Phase sau.

---

## 6. Checkpoint đề xuất

**Đã kiểm tra:** `backend/.env`, `database/.env` (`.gitignore:17`), `backend/dist` (`:12`), `node_modules` (`:2`), `backend/src/generated/prisma/` (`:41`) đều đã bị ignore; không có file nào trong số này đang được track.

**Danh sách file đề xuất stage:**

```text
backend/package.json
backend/package-lock.json
backend/vitest.config.ts
backend/vitest.config.e2e.ts
backend/src/main.ts
backend/src/app.module.ts
backend/src/config/env.config.ts
backend/src/prisma/prisma.module.ts
backend/src/prisma/prisma.service.ts
backend/src/auth/auth.controller.ts
backend/src/auth/auth.module.ts
backend/src/auth/auth.service.ts
backend/src/auth/auth.spec.ts
backend/src/auth/decorators/current-user.decorator.ts
backend/src/auth/decorators/roles.decorator.ts
backend/src/auth/dto/login.dto.ts
backend/src/auth/dto/register.dto.ts
backend/src/auth/guards/jwt-auth.guard.ts
backend/src/auth/guards/roles.guard.ts
backend/src/listings/dto/create-listing.dto.ts
backend/src/listings/dto/moderate-listing.dto.ts
backend/src/listings/dto/query-listings.dto.ts
backend/src/listings/dto/query-my-listings.dto.ts
backend/src/listings/dto/update-listing.dto.ts
backend/src/listings/listings.controller.ts
backend/src/listings/listings.module.ts
backend/src/listings/listings.service.ts
backend/src/listings/listings.spec.ts
backend/test/listings.e2e-spec.ts
docs/reports/PHASE2C_LISTINGS_BACKEND_PROGRESS_2026-10-27.md
```

**Commit message đề xuất (một commit chung):**

```text
feat(backend): add JWT auth/RBAC and listings lifecycle with moderation

Auth (Phase 2B)
- POST /api/auth/register (always BUYER, registrationIntent persisted),
  POST /api/auth/login, GET /api/auth/me
- JwtAuthGuard reloads the user from PostgreSQL on every request:
  rejects missing/inactive users and authorizes with the current DB role
- RolesGuard + @Roles(), @CurrentUser(), global ValidationPipe

Listings (Phase 2C)
- Create (OWNER/AGENT, DRAFT), PATCH (owner/ADMIN, DRAFT/REJECTED only),
  submit, public list/detail (APPROVED only, explicit allowlists),
  /mine, ADMIN moderation and moderation history
- Conditional, transactional writes for PATCH/submit/moderate; status
  change and ModerationLog are written atomically
- rentalPeriod validated against the resulting transaction type

Infrastructure
- Central env loader resolving backend/.env independently of cwd,
  preserving existing variables and validating DATABASE_URL/JWT_SECRET
- Unit tests (mocked) and e2e tests on real PostgreSQL with per-run
  record cleanup, isolation fingerprint and row-lock concurrency checks
```

**Phạm vi tiếp theo đề xuất:** chỉ làm **Internal MLS** (chia sẻ, thu hồi và lịch sử chia sẻ tin APPROVED). Contact Requests/Assignments để sang một giai đoạn riêng.

---

## 7. Lượt 5 — Xác minh lại sau checkpoint (30/10/2026, 20:19–20:26)

> [!NOTE]
> Các mục 1–6 ở trên là lịch sử, được giữ nguyên. Dòng "chưa commit" ở đầu báo cáo **không còn đúng**: Phase 2B + 2C đã được commit tại `bf9d6eb` và push lên `origin/feat/phase2c-listings`.

### 7.1 Trạng thái Git

- Nhánh hiện tại: `feat/phase2d-mls`, HEAD = `bf9d6eb`, chưa có commit MLS nào.
- `git merge-base --is-ancestor bf9d6eb HEAD` → exit 0.
- `feat/phase2c-listings` = `bf9d6eb`, đã đồng bộ với `origin/feat/phase2c-listings`.
- Không có `.env`, `dist/` hay `src/generated/` nào bị track (`git ls-files` → 0 kết quả).

### 7.2 Kiểm tra trên code đã commit (`bf9d6eb`, working tree sạch)

| Lệnh | Loại | Kết quả |
| :--- | :--- | :--- |
| `npm test` | Unit, Prisma mock | **PASS** 45/45 |
| `npm run test:e2e` | HTTP + PostgreSQL thật | **PASS** 14/14 (có 2 test đồng thời thật) |
| `npm run build` | Biên dịch | **PASS** |
| `npm run lint` | oxlint | **PASS** 0/0 (29 file) |
| `git diff --check` | Khoảng trắng | **PASS** |

### 7.3 Bổ sung sau checkpoint (chưa commit)

Lấp khoảng trống "NOT RUN (*)" ở mục 3.1: test e2e tạo **một user tạm** (ADMIN), rồi xóa trong `afterAll`. User seed không bị đụng tới.

- File: `backend/test/listings.e2e-spec.ts` (chỉ sửa test, không sửa code ứng dụng).
- Token cấp lúc còn ADMIN → `moderation-history` 200; hạ role trong DB xuống BUYER → cùng token đó bị **403**; `/api/auth/me` trả về `role = BUYER`, không có `passwordHash`.
- Khóa user (`isActive = false`) → token còn hạn bị **401** ở `/api/auth/me` và `/api/listings/mine`.

| Lệnh (sau khi bổ sung) | Kết quả |
| :--- | :--- |
| `npm run test:e2e` | **PASS** 16/16 (app 1, listings 15) |
| `npm run lint` | **PASS** 0/0 |
| `git diff --check` | **PASS** (chỉ có cảnh báo LF→CRLF) |

Dấu vân tay cách ly:

```text
[isolation] run-created listings cleaned: 4; run-created users cleaned: 1;
baseline={"listings":10,"logs":1,"users":5,"listingsMaxUpdatedAt":"2026-10-24T17:03:30.885Z","usersMaxUpdatedAt":"2026-10-24T17:03:30.782Z"}
after   ={"listings":10,"logs":1,"users":5,"listingsMaxUpdatedAt":"2026-10-24T17:03:30.885Z","usersMaxUpdatedAt":"2026-10-24T17:03:30.782Z"}
```

Bảng 3.1 cập nhật: hạ role và khóa user → DB thật **PASS**. Rollback khi tạo log thất bại trên DB thật vẫn **NOT RUN** (lý do không đổi, xem (**)).

### 7.4 npm audit (30/10, 20:24)

Vẫn **3 high**, không đổi so với 27/10: `body-parser@2.3.0` (qua `express@5.3.0`), `multer@2.4.0`, `@nestjs/platform-express@12.2.0` (dùng chung với `@nestjs/core` và `@nestjs/testing`). Output báo có `npm audit fix` (không cần `--force`). Chưa áp dụng.

### 7.5 Hạn chế còn lại

1. Rollback khi ghi log thất bại chỉ kiểm tra bằng mock.
2. Test đồng thời dựa vào `sleep(800ms)`, có thể chập chờn trên máy chậm.
3. 3 cảnh báo audit high chưa xử lý (nên xử lý trong một nhiệm vụ riêng về dependency).
