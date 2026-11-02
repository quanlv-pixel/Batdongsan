# BÁO CÁO KIỂM TOÁN BỔ SUNG NGHIỆM THU PHASE 2E-1 — FRONTEND AUTHENTICATION

- **Dự án**: Batdongsan Real Estate Platform
- **Mã kiểm toán**: Phase 2E-1 Supplemental Acceptance Audit
- **Ngày thực hiện**: 02/11/2026
- **Môi trường**: Windows Native / Next.js 16 (App Router) / NestJS 12 / PostgreSQL 16
- **Chi nhánh kiểm toán**: `feat/phase2e1-frontend-auth`
- **Commit cơ sở**: `9b9c61c` (từ nhánh `feat/phase2d2-contact-requests`)
- **Chế độ kiểm toán**: READ-ONLY (Chỉ đọc, không sửa đổi mã nguồn, không sửa đổi kiểm thử, không ghi database)

---

## 1. Tóm tắt điều hành (Executive Summary)

Kiểm toán bổ sung này được thực hiện độc lập nhằm đánh giá chi tiết 5 trọng điểm kỹ thuật và kiến trúc bảo mật của Phase 2E-1 trước khi tiến hành nghiệm thu chính thức:
1. **Tính năng "Ghi nhớ đăng nhập" (Remember-me)**: Checkbox tại giao diện [login/page.tsx](file:///D:/Batdongsan/frontend/src/app/login/page.tsx) chỉ lưu vào React state cục bộ, **không được gửi** qua API Client hay BFF Route Handler. Cookie `batdongsan_session` luôn được thiết lập cố định `maxAge = 7 ngày` dù checkbox được chọn hay không. Đây là điểm không khớp giữa giao diện và hành vi thực tế (UI/Behavior Mismatch).
2. **Trường Số điện thoại tại Form Đăng ký**: Người dùng có thể nhập số điện thoại tại [register/page.tsx](file:///D:/Batdongsan/frontend/src/app/register/page.tsx), nhưng trường này bị **loại bỏ chủ động ở tầng Frontend** trước khi gửi lên NestJS, do `RegisterDto` của NestJS không khai báo trường `phone` (và Backend kích hoạt `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`). Số điện thoại không được lưu trữ ở bất kỳ đâu. Đây là điểm không khớp giữa thiết kế UI Stitch và hợp đồng DTO Backend (UX/Contract Mismatch).
3. **Phân quyền và Vai trò (Role vs RegistrationIntent)**: Hệ thống bảo mật phân quyền hoạt động **chính xác và an toàn tuyệt đối**. Toàn bộ tài khoản đăng ký mới bắt buộc nhận vai trò thực tế là `BUYER` tại database Backend. `RegistrationIntent` chỉ ghi nhận mục đích sử dụng, không thể nâng quyền lên `OWNER`, `AGENT` hay `ADMIN`.
4. **Bảo mật BFF Route Handlers & Độ bao phủ Kiểm thử**: Các Route Handler (`login`, `logout`, `me`, `register`) đảm bảo nguyên tắc bảo mật: không lộ raw JWT ra ngoài client, chỉ giao tiếp với Backend upstream nội bộ cố định. Tuy nhiên, **chưa có bài kiểm thử đơn vị độc lập nào trực tiếp cho 4 Route Handlers này** (28 bài test hiện tại tập trung ở tầng UI components và API Client).
5. **Thời hạn JWT và Thời hạn Cookie**: Backend cấu hình `JWT_EXPIRES_IN=15m` (15 phút), trong khi Next.js BFF cấu hình cookie `maxAge = 7 ngày`. Phiên đăng nhập thực tế sẽ bị Backend từ chối sau 15 phút không hoạt động (khi đó `/api/auth/me` trả về 401 và xóa cookie). Cookie 7 ngày không đồng nghĩa với phiên JWT hợp lệ 7 ngày.
6. **Điều hướng Navbar**: Toàn bộ các liên kết trên Navbar (`/`, `/login`, `/register`) đều trỏ đến các route **thực tế đã được biên dịch thành công trong Next.js build**. Không có bất kỳ liên kết chết (dead link) nào.

---

## 2. Trạng thái Git và Chi nhánh Thực tế (Actual Branch and Git State)

Kiểm tra trạng thái Git thực tế tại không gian làm việc `D:\Batdongsan`:
- **Chi nhánh hiện tại**: `feat/phase2e1-frontend-auth`
- **Commit HEAD**: `9b9c61c feat(phase2d2): implement contact requests and agent assignments`
- **Trạng thái Working Tree**:
  - Các tệp tiền nhiệm của người dùng được bảo tồn nguyên vẹn: `backend/check-db-fingerprint.mjs`, `phase2d2-review.patch`, `docs/reports/PHASE2E_FRONTEND_INTEGRATION_READINESS_2026-11-01.md`.
  - Không có lệnh commit hay push nào được thực hiện.
  - Không có bất kỳ thay đổi nào làm ảnh hưởng đến mã nguồn Backend hay cơ sở dữ liệu.

---

## 3. Kiểm toán A — Hành vi Checkbox "Ghi nhớ phiên đăng nhập" (Remember-session Behavior)

### 3.1. Phân tích mã nguồn
- Tại [frontend/src/app/login/page.tsx](file:///D:/Batdongsan/frontend/src/app/login/page.tsx):
  - Dòng 17: Khai báo state: `const [rememberMe, setRememberMe] = useState(false);`
  - Dòng 270–276: Checkbox gắn kết:
    ```tsx
    <input
      type="checkbox"
      name="remember"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
      className="..."
    />
    ```
  - Dòng 35: Khi submit form:
    ```tsx
    await login({ email: email.trim(), password });
    ```
    -> Biến `rememberMe` **hoàn toàn không được truyền** vào hàm `login()`.
- Tại [frontend/src/types/index.ts](file:///D:/Batdongsan/frontend/src/types/index.ts) (Dòng 49–52):
  ```typescript
  export interface LoginRequest {
    email: string;
    password: string;
  }
  ```
  -> Kiểu dữ liệu `LoginRequest` không có trường `rememberMe`.
- Tại [frontend/src/app/api/auth/login/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/login/route.ts) (Dòng 28–34):
  ```typescript
  cookieStore.set('batdongsan_session', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days cố định
  });
  ```

### 3.2. Trả lời các câu hỏi kiểm toán
1. *Tích chọn checkbox có tạo cookie vĩnh viễn không?* -> Có, cookie nhận `maxAge = 7 ngày`.
2. *Bỏ tích checkbox có tạo session cookie (cookie phiên tự hủy khi tắt trình duyệt) không?* -> **Không**. Bỏ tích vẫn tạo cookie có `maxAge = 7 ngày`.
3. *Giá trị checkbox có được truyền từ trang login sang BFF không?* -> **Không**.
4. *BFF có sử dụng giá trị đó để đổi logic gán cookie không?* -> **Không**.
5. *Kết luận*: Cả hai trạng thái tích chọn và bỏ chọn đều tạo ra cookie 7 ngày giống hệt nhau. Đây là một **sự sai lệch giữa giao diện người dùng và hành vi thực tế (UI/Behavior Mismatch)**, mang tính chất trang trí giao diện ở thời điểm hiện tại.

---

## 4. Kiểm toán B — Trường Số điện thoại và Hợp đồng Đăng ký Backend (Registration Phone Field)

### 4.1. Phân tích mã nguồn
- Tại [frontend/src/app/register/page.tsx](file:///D:/Batdongsan/frontend/src/app/register/page.tsx):
  - Dòng 17: `const [phone, setPhone] = useState('');`
  - Dòng 284–302: Render trường nhập `phone` với nhãn *"Số điện thoại (không bắt buộc)"*.
  - Dòng 60–65: Khi submit form:
    ```typescript
    await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      registrationIntent: usagePurpose,
    });
    ```
    -> `phone` bị bỏ qua, không được truyền vào hàm `register()`.
- Tại [frontend/src/app/api/auth/register/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/register/route.ts) (Dòng 10–23):
  BFF Route Handler chủ động chỉ lọc 4 trường hợp lệ:
  ```typescript
  const payload: { email: string; password: string; fullName: string; registrationIntent?: string } = {
    email: body.email,
    password: body.password,
    fullName: body.fullName,
  };
  if (body.registrationIntent) payload.registrationIntent = body.registrationIntent;
  ```
- Tại Backend [backend/src/auth/dto/register.dto.ts](file:///D:/Batdongsan/backend/src/auth/dto/register.dto.ts):
  `RegisterDto` chỉ chứa `email`, `password`, `fullName`, `registrationIntent`. Nếu client gửi thêm trường `phone`, Backend sẽ lập tức trả về lỗi `HTTP 400 Bad Request` do kích hoạt `forbidNonWhitelisted: true`.
- Tại Backend [backend/prisma/schema.prisma](file:///D:/Batdongsan/backend/prisma/schema.prisma):
  Mô hình `User` có trường `phone String?`, nhưng API đăng ký hiện tại chưa hỗ trợ ghi nhận trường này.

### 4.2. Trả lời các câu hỏi kiểm toán
1. *Người dùng có nhập số điện thoại không?* -> Có thể nhập (không bắt buộc).
2. *Số điện thoại có được đưa vào yêu cầu từ client không?* -> Không, bị loại bỏ ở `register/page.tsx`.
3. *Có bị whitelist frontend loại bỏ có chủ đích không?* -> Đúng, để tránh lỗi HTTP 400 từ Backend.
4. *Backend RegisterDto có chấp nhận phone không?* -> Không.
5. *Số điện thoại có được lưu ở đâu không?* -> **Không được lưu trữ ở bất kỳ đâu**.
6. *Giao diện có thông báo cho người dùng biết số điện thoại chưa được lưu không?* -> Chưa có thông báo, giao diện chỉ ghi `(không bắt buộc)`.
7. *Kết luận*: Đây là **sự không khớp giữa thiết kế giao diện (Stitch Screen Design afd1e0bf...) và hợp đồng API Backend (UX/Contract Mismatch)**.

---

## 5. Kiểm toán Phân quyền Nghiệp vụ (RegistrationIntent vs Role Security)

Kiểm toán xác nhận quy tắc bảo mật phân quyền:
- Tại [backend/src/auth/auth.service.ts](file:///D:/Batdongsan/backend/src/auth/auth.service.ts) (Dòng 33–45):
  ```typescript
  // CRITICAL SECURITY ENFORCEMENT:
  // Regardless of registrationIntent (BUYER/OWNER/AGENT) or any client input,
  // the user is strictly created with role = Role.BUYER.
  // Elevated roles (AGENT, OWNER, ADMIN) must be verified and assigned by an Admin.
  const user = await this.prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      registrationIntent: dto.registrationIntent ?? RegistrationIntent.BUYER,
      role: Role.BUYER,
      isActive: true,
    },
    ...
  });
  ```
- Tại Frontend BFF [frontend/src/app/api/auth/register/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/register/route.ts):
  BFF không bao giờ chuyển tiếp trường `role` từ client lên Backend.
- **Kết luận**: Người dùng đăng ký chọn mục đích là "Đăng tin bất động sản" (`OWNER`) hay "Hoạt động môi giới" (`AGENT`) chỉ được lưu vào `registrationIntent`. Vai trò bảo mật thực tế luôn là `BUYER`. Không có lỗ hổng leo thang đặc quyền (Privilege Escalation).

---

## 6. Kiểm toán C — Bảo mật BFF Route Handlers (BFF Route Handler Security)

### 6.1. Route `/api/auth/login` ([login/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/login/route.ts))
- **Ưu điểm**:
  - Gửi request đến URL nội bộ cố định từ `getBackendBaseUrl()`, không nhận upstream host tùy tiện từ client.
  - Phản hồi Backend nếu lỗi sẽ trả về mã trạng thái tương ứng, không gây crash server.
  - Gán cookie `batdongsan_session` với `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: production`.
  - Phản hồi JSON chỉ trả về `{ user }`, **tuyệt đối không trả về raw JWT** cho client JavaScript.
  - Bắt lỗi an toàn, không để lộ stack trace hay cấu hình bí mật.
- **Hạn chế nhỏ**: Chưa xác thực schema `body` trước khi gọi upstream (dựa hoàn toàn vào validation của NestJS).

### 6.2. Route `/api/auth/me` ([me/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/me/route.ts))
- **Ưu điểm**:
  - Đọc cookie `batdongsan_session` hoàn toàn ở phía server qua `next/headers`.
  - Trả về `401 Unauthenticated` nếu không có cookie.
  - Đính kèm token dạng `Authorization: Bearer <token>` gọi sang NestJS.
  - Nếu NestJS trả về 401 (token hết hạn hoặc sai), tự động gọi `cookieStore.delete('batdongsan_session')` để dọn sạch cookie rác trên trình duyệt.
  - Không bao giờ trả token về trình duyệt.

### 6.3. Route `/api/auth/logout` ([logout/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/logout/route.ts))
- **Ưu điểm**:
  - Gọi `cookieStore.delete('batdongsan_session')` chính xác.
  - Không tuyên bố sai lệch về việc thu hồi token trên server (bởi vì NestJS JWT là stateless và chưa có token blacklist).

### 6.4. Route `/api/auth/register` ([register/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/register/route.ts))
- **Ưu điểm**:
  - Whitelist chặt chẽ 4 trường hợp lệ.
  - Ngăn chặn hoàn toàn việc client cố tình gửi các trường đặc quyền như `role`, `id`, `isActive`.
  - Không tự động đăng nhập nếu Backend chưa hỗ trợ tạo session trực tiếp lúc đăng ký.

---

## 7. Kiểm toán Độ bao phủ Kiểm thử BFF (BFF Test Coverage Gap)

### Hiện trạng tệp kiểm thử hiện tại:
Tất cả 5 tệp kiểm thử trong [frontend/src/\_\_tests\_\_/](file:///D:/Batdongsan/frontend/src/__tests__/) gồm:
1. `api-client.test.ts`: Kiểm thử lớp `ApiClient` bằng cách mock `global.fetch`.
2. `AuthContext.test.tsx`: Kiểm thử Context bằng cách mock module `apiClient`.
3. `Navbar.test.tsx`: Kiểm thử UI Navbar bằng cách mock `useAuth`.
4. `LoginPage.test.tsx`: Kiểm thử trang Đăng nhập bằng cách mock `useAuth`.
5. `RegisterPage.test.tsx`: Kiểm thử trang Đăng ký bằng cách mock `useAuth`.

### Khoảng trống kiểm thử (Coverage Gap):
- **Không có bài kiểm thử đơn vị nào chạy trực tiếp mã nguồn của 4 Route Handlers**:
  - `frontend/src/app/api/auth/login/route.ts`
  - `frontend/src/app/api/auth/logout/route.ts`
  - `frontend/src/app/api/auth/me/route.ts`
  - `frontend/src/app/api/auth/register/route.ts`
- **Không có bài kiểm thử tích hợp (Integration Test)** xác thực hành vi gán/xóa cookie thật sự giữa Browser -> Next.js BFF -> NestJS.
- **Đánh giá rủi ro**: Mặc dù mã nguồn Route Handler ngắn gọn và chuẩn Next.js App Router, việc thiếu kiểm thử trực tiếp cho tầng BFF khiến các thay đổi logic cookie sau này dễ phát sinh lỗi hồi quy nếu không được kiểm thử tự động.

---

## 8. Kiểm toán D — Thời hạn JWT, Thời hạn Cookie và CSRF (Expiration & CSRF)

### 8.1. So sánh thời hạn JWT và Cookie
| Thuộc tính | Cấu hình Backend NestJS | Cấu hình Next.js BFF Cookie | Đánh giá đồng bộ |
|---|---|---|---|
| **Thời hạn hiệu lực** | `15 phút` (`JWT_EXPIRES_IN=15m` tại `backend/.env`) | `7 ngày` (`maxAge: 7 * 24 * 60 * 60` tại `login/route.ts`) | **KHÔNG ĐỒNG BỘ** |

### 8.2. Hệ quả vận hành thực tế
1. Khi đăng nhập thành công, trình duyệt nhận cookie có hạn dùng 7 ngày.
2. Tuy nhiên, chuỗi JWT được mã hóa bên trong cookie chỉ có thời hạn sống thực tế là **15 phút**.
3. Sau 15 phút, nếu người dùng tải lại trang hoặc gọi API, Backend NestJS sẽ từ chối với mã lỗi `HTTP 401 Unauthorized` vì JWT đã hết hạn.
4. Route handler `/api/auth/me` sẽ xóa cookie và đưa trạng thái người dùng về chưa đăng nhập (`Unauthenticated`).
5. **Kết luận**: Người dùng thực tế **chỉ duy trì phiên làm việc trong 15 phút**, chứ không phải 7 ngày. Việc gán cookie 7 ngày gây hiểu lầm rằng phiên làm việc kéo dài 7 ngày, trong khi hệ thống chưa có cơ chế Refresh Token để gia hạn.

### 8.3. Bảo vệ CSRF và Request-Origin
- Cookie được đặt cờ `SameSite: 'lax'`.
- Thuộc tính `SameSite: Lax` ngăn chặn trình duyệt gửi kèm cookie trong các yêu cầu cross-site POST/PUT/DELETE từ domain khác.
- Hiện tại, các route BFF nhận POST gồm:
  - `POST /api/auth/login`: Không yêu cầu cookie xác thực.
  - `POST /api/auth/register`: Không yêu cầu cookie xác thực.
  - `POST /api/auth/logout`: Thao tác xóa cookie.
- **Đánh giá hiện tại**: Không có nguy cơ CSRF trực tiếp ở Phase 2E-1.
- **Rủi ro tương lai**: Khi Phase 2E-2 trở đi triển khai các route BFF nhận request thay đổi dữ liệu có cookie xác thực (như tạo tin đăng, gửi yêu cầu liên hệ), việc kiểm tra header `Origin` / `Referer` hoặc tích hợp CSRF token là **bắt buộc**.

---

## 9. Kiểm toán E — Bảng đối chiếu Đường dẫn Navbar (Navbar Route Audit)

Đối chiếu toàn bộ các thẻ `<Link>` và nút điều hướng trong [Navbar.tsx](file:///D:/Batdongsan/frontend/src/components/common/Navbar.tsx) với danh mục Route đã biên dịch thực tế của Next.js:

| Nhãn điều hướng | Href thực tế | Route có tồn tại trong Build? | Kết quả kiểm toán |
|---|---|---|---|
| **Logo Batdongsan** | `/` | Có (`○ /` Static) | Hợp lệ (Trang chủ) |
| **Trang chủ (Menu Desktop)** | `/` | Có (`○ /` Static) | Hợp lệ |
| **Đăng nhập (Nút Header)** | `/login` | Có (`○ /login` Static) | Hợp lệ (Màn hình Login) |
| **Đăng ký (Nút Header)** | `/register` | Có (`○ /register` Static) | Hợp lệ (Màn hình Register) |
| **Trang chủ (Menu Mobile)** | `/` | Có (`○ /` Static) | Hợp lệ |
| **Đăng nhập (Menu Mobile)** | `/login` | Có (`○ /login` Static) | Hợp lệ |
| **Đăng ký (Menu Mobile)** | `/register` | Có (`○ /register` Static) | Hợp lệ |
| **Đăng xuất (Button)** | `onClick={handleLogout}` -> `/login` | Có (Gọi `POST /api/auth/logout` và chuyển hướng `/login`) | Hợp lệ |

*Ghi chú*: Trong bản báo cáo trước có đoạn văn mô tả các mục "Mua bán", "Cho thuê", "Dự án" dựa theo mockup Stitch, nhưng trong mã nguồn thực tế triển khai của [Navbar.tsx](file:///D:/Batdongsan/frontend/src/components/common/Navbar.tsx), nhóm kỹ sư đã **chủ động chỉ để lại link "Trang chủ" (`/`)** để tuân thủ nguyên tắc không tạo liên kết tới các trang chưa triển khai. **Không có bất kỳ liên kết chết (dead link) nào trong Navbar**.

---

## 10. Đánh giá Bằng chứng Trực quan Stitch (Visual Evidence & Limitations)

- **Mức độ bám sát mã nguồn Stitch**:
  - Mã nguồn HTML và CSS của hai màn hình `172be7f0326346cc93a182fd06abc7d7` (Login) và `afd1e0bfcea14563ab2e8243a927318b` (Register) đã được trích xuất trực tiếp qua công cụ Google Stitch MCP.
  - Các thông số màu sắc (`#0F766E`, `#142B4A`, `#F8FAFC`), lưới bố cục 12 cột, tỷ lệ khung ảnh, thẻ radio mục đích và typography Be Vietnam Pro được ánh xạ 100% vào mã nguồn JSX/Tailwind.
- **Giới hạn kiểm toán độc lập**:
  - Trong phạm vi phiên kiểm toán READ-ONLY này, chưa thực hiện chụp ảnh so sánh pixel tự động (Playwright Visual Regression) giữa bản render trên trình duyệt thật và bản thiết kế Stitch nguyên mẫu.
  - Do đó, tính tương đương về mặt cấu trúc và thẩm mỹ mã nguồn được xác nhận dựa trên mã nguồn Stitch trích xuất, nhưng **chưa thể khẳng định tính tương đương tuyệt đối từng pixel (pixel-perfect) độc lập bằng ảnh chụp so sánh tự động**.

---

## 11. Bảng Tổng hợp Vấn đề Xác nhận, Rủi ro Tiềm ẩn và Khoảng trống Kiểm thử

| STT | Vấn đề / Khoảng trống | Phân loại | Tệp & Vị trí liên quan | Mức độ nghiêm trọng | Tác động thực tế |
|---|---|---|---|---|---|
| **1** | Checkbox "Ghi nhớ đăng nhập" không ảnh hưởng đến hạn cookie | UI/Behavior Mismatch | [login/page.tsx:L17,35](file:///D:/Batdongsan/frontend/src/app/login/page.tsx#L17-L35), [login/route.ts:L33](file:///D:/Batdongsan/frontend/src/app/api/auth/login/route.ts#L33) | Thấp (Minor) | Checkbox chỉ mang tính trang trí, cookie luôn là 7 ngày. |
| **2** | Trường Số điện thoại bị loại bỏ khi đăng ký | UX/Contract Mismatch | [register/page.tsx:L60-65](file:///D:/Batdongsan/frontend/src/app/register/page.tsx#L60-L65), [register.dto.ts](file:///D:/Batdongsan/backend/src/auth/dto/register.dto.ts) | Thấp (Minor) | Người dùng nhập số điện thoại nhưng không được lưu; không có thông báo giải thích. |
| **3** | Không có bài kiểm thử đơn vị cho 4 BFF Route Handlers | Test Coverage Gap | [src/app/api/auth/*/route.ts](file:///D:/Batdongsan/frontend/src/app/api/auth/) | Trung bình (Medium) | Chưa có kiểm thử tự động xác nhận việc gán và xóa HttpOnly cookie. |
| **4** | Lệch thời hạn JWT (15 phút) và Cookie (7 ngày) | Configuration Mismatch | [backend/.env:L17](file:///D:/Batdongsan/backend/.env#L17), [login/route.ts:L33](file:///D:/Batdongsan/frontend/src/app/api/auth/login/route.ts#L33) | Trung bình (Medium) | Phiên làm việc thực tế hết hạn sau 15 phút dù cookie còn 7 ngày; không có refresh token. |
| **5** | Thiếu xác thực Origin / CSRF cho các yêu cầu state-changing | Future Security Concern | [frontend/src/app/api/auth/](file:///D:/Batdongsan/frontend/src/app/api/auth/) | Thấp hiện tại, Cao ở Phase sau | Hiện chưa có route nghiệp vụ nhạy cảm dùng cookie; cần bổ sung khi làm tính năng CRUD tiếp theo. |

---

## 12. Khuyến nghị Khắc phục Tối thiểu (Recommended Minimal Next Remediation)

Để Phase 2E-1 đạt độ hoàn thiện cao nhất hoặc làm tiền đề vững chắc cho Phase 2E-2, khuyến nghị các bước xử lý nhỏ gọn sau:
1. **Khắc phục Checkbox "Ghi nhớ đăng nhập"**:
   - Truyền cờ `rememberMe: boolean` từ `LoginPage` sang `apiClient.login()` và BFF `login/route.ts`.
   - Nếu `rememberMe === false`, thiết lập cookie phiên (`maxAge: undefined` để cookie tự hủy khi đóng trình duyệt). Nếu `true`, thiết lập `maxAge: 7 ngày` (hoặc đồng bộ với thời hạn refresh token khi có).
2. **Khắc phục UX Trường Số điện thoại**:
   - Tạm thời ẩn trường Số điện thoại trên form đăng ký, hoặc thêm ghi chú rõ ràng: *"Thông tin số điện thoại có thể cập nhật sau trong trang Cá nhân khi tính năng quản lý hồ sơ hoàn thiện (GAP-04)"*.
3. **Bổ sung Kiểm thử Đơn vị cho Route Handlers**:
   - Viết tệp kiểm thử `frontend/src/__tests__/bff-auth-routes.test.ts` kiểm thử trực tiếp hàm `POST()` của `login/route.ts`, `logout/route.ts`, `register/route.ts` và hàm `GET()` của `me/route.ts` (mocking `next/headers` cookies).
4. **Đồng bộ Thời hạn Phiên làm việc**:
   - Ở môi trường phát triển cục bộ, nếu chưa có Refresh Token, có thể cân nhắc cấu hình `JWT_EXPIRES_IN=7d` tại `backend/.env` để đồng bộ với cookie 7 ngày, hoặc điều chỉnh cookie `maxAge` về `15 * 60` (15 phút) để tránh việc người dùng bị văng phiên bất ngờ.

---

## 13. Khuyến nghị Nghiệm thu Cuối cùng (Final Acceptance Recommendation)

Căn cứ vào kết quả kiểm toán khách quan:
- Hệ thống nền tảng Frontend, API Client, bảo mật JWT qua HttpOnly cookie, ngăn ngừa XSS, và phân quyền Backend Role `BUYER` đều hoạt động chuẩn xác, không có lỗi runtime hay lỗi bảo mật nghiêm trọng nào gây chặn hệ thống.
- Tuy nhiên, tồn tại một số điểm lệch nhỏ về mặt UX (Remember-me, Phone) và khoảng trống kiểm thử tầng Route Handler cần được ghi nhận và khắc phục nhanh.

Lựa chọn khuyến nghị:

**MINOR UX OR TEST COVERAGE FIXES RECOMMENDED**
*(Khuyến nghị khắc phục các điểm nhỏ về UX hoặc độ bao phủ kiểm thử trước khi chuyển sang lát cắt tiếp theo)*
