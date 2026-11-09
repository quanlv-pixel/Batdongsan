# BÁO CÁO GIA CỐ BẢO MẬT & KIỂM ĐỊNH CHẤT LƯỢNG CUỐI CÙNG — PULL REQUEST #2 (PHASE 2E-2C)
**Dự án:** Nền tảng Bất động sản Batdongsan
**Nhánh làm việc:** `feat/phase2e2c-listing-detail`
**Pull Request mục tiêu:** `quanlv-pixel/Batdongsan#2` hướng về `main`
**Commit cơ sở trước gia cố:** `b37f07a`
**Ngày thực hiện:** 08/11/2026
**Trạng thái kiểm định:** **HOÀN TOÀN ĐẠT CHUẨN (ALL VERIFICATIONS PASSED — READY FOR USER STAGING & MERGE)**

---

## 1. TỔNG QUAN NHIỆM VỤ GIA CỐ

Đợt rà soát và gia cố cuối cùng cho Pull Request #2 tập trung vào việc loại bỏ các lỗ hổng bảo mật tiềm ẩn, chuẩn hóa hành vi HTTP, bảo chứng tính trung thực dữ liệu đối với người dùng cuối, hoàn thiện trải nghiệm trợ năng (a11y), nâng cao độ bao phủ kiểm thử tự động và cập nhật tài liệu kỹ thuật đồng bộ.

Tất cả các thay đổi được giữ ở trạng thái **unstaged** trong working tree theo đúng nguyên tắc an toàn kho mã nguồn. Hai tệp private (`backend/check-db-fingerprint.mjs` và `phase2d2-review.patch`) được bảo vệ nguyên vẹn tuyệt đối.

---

## 2. CHI TIẾT CÁC HẠNG MỤC GIA CỐ & KHẮC PHỤC

### 2.1. Thẩm Định & Gia Cố Luồng Chuyển Hướng `returnTo` Chống Open Redirect
- **Tệp mới:** `frontend/src/lib/navigation.ts`
- **Bộ kiểm thử:** `frontend/src/__tests__/navigation.test.ts` (13/13 tests pass)
- **Tích hợp:** `frontend/src/app/[locale]/login/page.tsx` và `frontend/src/app/[locale]/register/page.tsx`
- **Chi tiết xử lý:**
  - Thay thế kiểm tra sơ sài `startsWith('/') && !startsWith('//')` bằng module chuẩn hóa chuyên dụng `sanitizeReturnTo` và `isValidReturnTo`.
  - Phân tích cú pháp URL dựa trên dummy origin nội bộ (`http://localhost.internal`) để bảo toàn chính xác `pathname`, `search`, `hash` cùng nguồn gốc (same-origin).
  - Triệt tiêu hoàn toàn các vector tấn công Open Redirect:
    - Loại bỏ các URL có protocol bên ngoài (`https:`, `http:`, `javascript:`, `data:`, `vbscript:`).
    - Loại bỏ protocol-relative paths (`//evil.com`).
    - Loại bỏ dấu gạch chéo ngược (`\`, `/\\`, `/\`) và biến thể mã hóa URL (`%5c`, `%5C`) thường dùng để đánh lừa bộ phân tích URL của trình duyệt.
    - Loại bỏ ký tự điều khiển nguy hiểm (`\x00` - `\x1F`, `\x7F`).
    - Trả về đường dẫn fallback an toàn khi dữ liệu đầu vào không hợp lệ.

### 2.2. Chuẩn Hóa Ngữ Nghĩa HTTP 404 & Cơ Chế Xử Lý Lỗi Backend 500
- **Tệp mới:**
  - `frontend/src/app/[locale]/bat-dong-san/[id]/not-found.tsx`: Client Component hiển thị giao diện 404 chuyên dụng chuẩn SEO với testids (`detail-not-found-container`, `detail-not-found-title`, `detail-not-found-description`, `detail-not-found-back-btn`).
  - `frontend/src/app/[locale]/bat-dong-san/[id]/error.tsx`: Error Boundary chuyên biệt cho lỗi 500/mạng kèm nút "Thử lại" (`reset()`) và điều hướng về trang tìm kiếm.
- **Tệp cập nhật:**
  - `frontend/src/app/[locale]/bat-dong-san/[id]/page.tsx`: Gọi `notFound()` từ Next.js navigation khi tin đăng không tồn tại hoặc có trạng thái khác `APPROVED`, kích hoạt mã trạng thái HTTP 404 thực sự thay vì render JSX nội tuyến với mã HTTP 200. Các ngoại lệ kết nối/5xx được để truyền tự nhiên tới `error.tsx`.
  - `frontend/src/app/[locale]/bat-dong-san/[id]/layout.tsx`: `generateMetadata` bắt lỗi ngoại lệ mạng/5xx từ backend và cung cấp metadata dự phòng cục bộ của nền tảng Batdongsan thay vì nhận diện sai thành lỗi không tìm thấy (404).

### 2.3. Đảm Bảo Tính Trung Thực Dữ Liệu (Data Truthfulness) & Tính Trợ Năng (A11y)
- **Tệp cập nhật:**
  - `frontend/src/components/detail/PropertyOverview.tsx`: Loại bỏ hoàn toàn nhãn "Giá thương lượng" (`priceNegotiable`) không có trường dữ liệu tương ứng trong schema database.
  - `frontend/src/components/detail/PropertyContactCard.tsx`:
    - Loại bỏ thẻ tĩnh giả định "Chuyên viên tư vấn khu vực" (`agentCardTitle`, `agentRole`, `agentTrust`) nhằm tránh gây hiểu lầm cho người dùng về việc hệ thống đã chỉ định chuyên viên riêng.
    - Chuẩn hóa thông báo unauthenticated và phụ đề thẻ liên hệ về câu chữ trung thực: gửi yêu cầu nhận tư vấn chi tiết về bất động sản.
    - Cập nhật thông điệp gửi thành công phản ánh chính xác trạng thái: "Yêu cầu liên hệ của bạn (mã: #{id}) đã được ghi nhận trên hệ thống."
    - Tinh chỉnh nội dung cam kết quyền riêng tư, tham chiếu đến Chính sách bảo mật thay vì các cam kết "bảo mật tuyệt đối 100%" không thể chứng minh.
  - `frontend/src/components/detail/PropertyDescription.tsx`: Thay thế câu chữ cứng bằng khóa đa ngôn ngữ `{dict.PropertyDetail.description.noDescription}` cho cả Tiếng Việt và Tiếng Anh khi tin đăng chưa có mô tả.
  - `frontend/src/components/detail/PropertyGallery.tsx`: Hỗ trợ đầy đủ phím `Space` và `Enter` trên cả ảnh chính và các thumbnail phụ theo chuẩn WAI-ARIA (`role="button"`, `tabIndex={0}`).
  - `frontend/messages/vi.json` & `frontend/messages/en.json`: Dọn dẹp các khóa không còn sử dụng và đồng bộ ngữ nghĩa song ngữ.

### 2.4. Gia Cố BFF Route Handler Yêu Cầu Liên Hệ
- **Tệp cập nhật:** `frontend/src/app/api/contact-requests/route.ts`
- **Bộ kiểm thử:** `frontend/src/__tests__/bff-contact-requests.test.ts` (10/10 tests pass)
- **Chi tiết xử lý:**
  - Thẩm định payload JSON: bắt buộc phải là đối tượng JSON hợp lệ (từ chối mảng, null, primitive types).
  - Thẩm định chặt chẽ trường `message`: nếu được truyền lên phải là chuỗi ký tự hợp lệ (`typeof message === 'string'`).
  - Thẩm định trường `listingId`: phải là chuỗi ký tự không rỗng (`trim().length > 0`).
  - Thẩm định cam kết `contactConsent === true`.
  - Che giấu toàn bộ exception stack, thông điệp lỗi nội bộ hoặc chuỗi kết nối cơ sở dữ liệu khi backend gặp sự cố 500, chỉ trả về thông báo chung `Internal Server Error`.

---

## 3. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ TOÀN DIỆN

| Bộ Kiểm Thử / Công Cụ | Số Lượng Test | Kết Quả | Ghi Chú |
| :--- | :---: | :---: | :--- |
| **Frontend Vitest Suites** | **153/153** | **PASS (100%)** | 15/15 files pass: `detail.test.tsx` (23), `bff-contact-requests.test.ts` (10), `navigation.test.ts` (13), `LoginPage.test.tsx` (8), `RegisterPage.test.tsx` (8), `search.test.tsx` (19), `i18n.test.tsx` (14), `HomePage.test.tsx` (4), `Navbar.test.tsx` (8), `ListingCard.test.tsx` (5), `HeroSearchBox.test.tsx` (5), `bff-auth-routes.test.ts` (13), `api-client.test.ts` (9), `formatters.test.ts` (10), `AuthContext.test.tsx` (4). |
| **Backend Vitest Suites** | **132/132** | **PASS (100%)** | 5/5 spec suites pass (và 128 tests trong 12 unit test files pass). |
| **Frontend ESLint** | Toàn bộ codebase | **PASS (0 errors, 0 warnings)** | Quy chuẩn Next.js & React 19 nghiêm ngặt. |
| **Backend Oxlint** | 49 tệp, 96 rules | **PASS (0 errors, 0 warnings)** | Không phát hiện cảnh báo mã nguồn. |
| **Frontend Production Build** | Next.js 16 Turbopack | **PASS** | Type-checking pass trong 6.0s, biên dịch 23 routes tĩnh/động thành công. |
| **Backend Production Build** | NestJS CLI | **PASS** | Biên dịch TypeScript backend dist/ sạch sẽ 100%. |
| **Chrome CDP Browser Suite** | **8/8 kịch bản** | **PASS (100%)** | Chạy trên trình duyệt Chrome thực tế với viewport desktop và mobile. |

---

## 4. BẢNG ĐỐI CHIẾU KIỂM THỬ CHẤP NHẬN TRÌNH DUYỆT (CHROME CDP)

Toàn bộ 8 kịch bản kiểm thử giao diện người dùng thực tế được thực thi tự động qua tệp `scratch/browser-verify-detail.mjs` kết nối Chrome DevTools Protocol:

| STT | Tên Kịch Bản & URL | Mã HTTP | Minh Chứng Ảnh | Trạng Thái Thẩm Định |
| :---: | :--- | :---: | :--- | :---: |
| **1** | Chi tiết Desktop Tiếng Việt<br>`http://localhost:3000/vi/bat-dong-san/seed_listing_01` | `200 OK` | `phase2e2c-detail/01-vi-detail-desktop.png` | **PASS**<br>H1, giá 7,8 tỷ, đơn giá ~99 tr/m², gallery, specs table, canonical, alternates. |
| **2** | Chi tiết Desktop Tiếng Anh<br>`http://localhost:3000/en/bat-dong-san/seed_listing_01` | `200 OK` | `phase2e2c-detail/02-en-detail-desktop.png` | **PASS**<br>Price 7.8B VND, badge Apartment for Sale, lời nhắc đăng nhập tiếng Anh trung thực. |
| **3** | Thư viện Lightbox Modal toàn màn hình | `200 OK` | `phase2e2c-detail/03-vi-lightbox-modal-desktop.png` | **PASS**<br>Mở lightbox, counter Ảnh 1 / 2, nút trước/sau, đóng thành công bằng phím `Escape`. |
| **4** | Thẻ liên hệ cho khách vãng lai & `returnTo` | `200 OK` | `phase2e2c-detail/04-vi-login-return-to-desktop.png` | **PASS**<br>Liên kết `returnTo=%2Fvi%2Fbat-dong-san%2Fseed_listing_01` bảo toàn đường dẫn. |
| **5** | Đăng nhập tài khoản Buyer & Tự động Redirect | `200 OK` | `phase2e2c-detail/05-vi-detail-authenticated-desktop.png` | **PASS**<br>Đăng nhập buyer mẫu, tự động quay lại trang chi tiết, hiển thị form liên hệ đầy đủ. |
| **6** | Gửi yêu cầu tư vấn thành công kèm mã động | `200 OK` | `phase2e2c-detail/06-vi-contact-request-success-desktop.png` | **PASS**<br>Ghi nhận thành công, sinh mã yêu cầu động từ database (mã `#CMW80VYC`), lưu vào PostgreSQL. |
| **7** | Giao diện Không tìm thấy (404) | `404 Not Found` | `phase2e2c-detail/07-vi-detail-not-found-desktop.png` | **PASS**<br>Render qua `not-found.tsx`, mã HTTP 404 thực thụ, nút điều hướng quay về danh sách. |
| **8** | Giao diện Responsive Mobile (390x844) | `200 OK` | `phase2e2c-detail/08-vi-detail-mobile.png` | **PASS**<br>Không phát sinh thanh cuộn ngang (`scrollWidth === clientWidth === 390px`), huy hiệu ảnh thu gọn. |

---

## 5. TÀI LIỆU KỸ THUẬT & HƯỚNG DẪN BẢO TRÌ

Tài liệu hướng dẫn kỹ thuật dành cho nhà phát triển đã được cập nhật toàn diện tại:
`docs/guides/PHASE2E2C_LISTING_DETAIL_CONTACT_DEVELOPER_GUIDE.md`
- Đồng bộ số lượng bài kiểm thử (153 tests Frontend, 132 tests Backend).
- Bổ sung tài liệu về hàm gia cố `sanitizeReturnTo` và `isValidReturnTo`.
- Cập nhật handler BFF `/api/contact-requests/route.ts` với đầy đủ cơ chế bảo vệ che giấu stack trace 500.
- Giải thích rõ cơ chế mã yêu cầu liên hệ động từ backend.
- Lưu ý an toàn tài khoản phát triển cục bộ (`buyer@example.test`).
- Chuẩn hóa toàn bộ đường dẫn tương đối, bảo đảm tính khả chuyển trên mọi môi trường.

---

## 6. KẾT LUẬN & TRẠNG THÁI GIT

Pull Request #2 (`feat/phase2e2c-listing-detail`) đã hoàn thành toàn bộ công tác gia cố an toàn, sửa lỗi giao diện, tối ưu trợ năng và bảo chứng kiểm thử. Toàn bộ các thay đổi đang nằm an toàn ở trạng thái unstaged trong working tree, sẵn sàng để người quản trị dự án xem xét và thực hiện staging/commit/merge.
