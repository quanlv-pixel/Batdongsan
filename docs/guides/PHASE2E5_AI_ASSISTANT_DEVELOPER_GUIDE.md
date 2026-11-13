# HƯỚNG DẪN DÀNH CHO NHÀ PHÁT TRIỂN — PHASE 2E-5: AI PROPERTY ASSISTANT
## Trợ Lý Tìm Kiếm Bất Động Sản Thông Minh Dựa Trên Dữ Liệu Thật (Next.js 16 BFF & NestJS)

Tài liệu này cung cấp hướng dẫn kỹ thuật chi tiết về kiến trúc, cơ chế phân tích ngôn ngữ tự nhiên (NLP), bảo mật dữ liệu công khai (Grounding & Privacy Allowlist), giao diện đa ngôn ngữ và quy trình kiểm thử cho phân hệ **AI Property Assistant** (Phase 2E-5) của nền tảng Batdongsan.

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC GROUNDING

Trợ lý AI Bất động sản được thiết kế theo mô hình **Grounded Search Assistant** thông qua lớp trung gian **Next.js 16 BFF (`POST /api/assistant/chat`)**:
1. **Không bịa đặt dữ liệu (Zero Hallucination):** Mọi gợi ý bất động sản trả về đều được truy vấn trực tiếp từ nguồn dữ liệu thật `GET /api/listings` của NestJS backend (chỉ lấy tin đăng có trạng thái `APPROVED`).
2. **Bảo vệ dữ liệu nhạy cảm (Strict Public Allowlist):** Toàn bộ kết quả trước khi trả về trình duyệt đều được lọc qua hàm `toAssistantRecommendation()`, chỉ giữ lại các trường công khai (`id`, `title`, `priceVnd`, `rentalPeriod`, `areaSqm`, `propertyType`, `transactionType`, `province`, `district`, `ward`, `thumbnailUrl`). Tuyệt đối loại bỏ `streetAddress`, `latitude`, `longitude`, `ownerId`, email và số điện thoại chủ sở hữu.
3. **Không lộ API Key ra Client:** Nếu biến môi trường `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` được cấu hình trên server, BFF có thể tóm tắt câu trả lời tự nhiên bằng LLM dựa trên JSON đã được kiểm duyệt, với cơ chế tự động quay về câu trả lời xác định (deterministic localized reply) nếu không có key hoặc khi gọi API ngoài thất bại.

---

## 2. LỚP TRUNG GIAN BFF (`POST /api/assistant/chat`)

### 2.1 Tệp triển khai
- **Route Handler:** `frontend/src/app/api/assistant/chat/route.ts`
- **NLP & Grounding Logic:** `frontend/src/lib/assistant-nlp.ts`
- **TypeScript Contracts:** `frontend/src/types/assistant.ts` (re-export qua `frontend/src/types/index.ts`)

### 2.2 Kiểm tra đầu vào (Input Validation)
- Yêu cầu payload JSON hợp lệ dạng object (`400 Bad Request` nếu lỗi cú pháp hoặc không phải object).
- `message`: Chuỗi không rỗng, độ dài sau khi trim từ `1` đến `500` ký tự (`400` nếu sai kiểu, rỗng hoặc vượt quá 500 ký tự).
- `locale`: `'vi'` hoặc `'en'` (mặc định an toàn là `'vi'`).
- `history`: Mảng tùy chọn (tối đa `6` lượt hội thoại gần nhất, làm sạch `role` và `content`).
- Lỗi bất ngờ ở tầng server luôn được che giấu và trả về HTTP `500` chung chung, không rò rỉ stack trace.

### 2.3 Trích xuất ý định tìm kiếm (`extractPropertySearchIntent`)
Hàm phân tích song ngữ Việt - Anh hỗ trợ các tiêu chí khớp với `QueryListingsDto` của NestJS và `PropertyType` trong Prisma schema:
- **Hình thức giao dịch (`transactionType`):**
  - `FOR_SALE`: "mua", "bán", "buy", "sale", "for sale".
  - `FOR_RENT`: "thuê", "cho thuê", "rent", "lease", "for rent".
- **Loại bất động sản (`propertyType`):**
  - `APARTMENT`: "căn hộ", "chung cư", "apartment", "condo".
  - `HOUSE`: "nhà phố", "nhà riêng", "nhà ở", "house", "townhouse".
  - `VILLA`: "biệt thự", "villa".
  - `LAND`: "đất nền", "đất", "land", "plot".
  - `COMMERCIAL`: "thương mại", "văn phòng", "mặt bằng", "shophouse", "commercial", "office".
  - `OTHER`: "nhà xưởng", "kho xưởng", "warehouse".
- **Khoảng giá (`minPrice`, `maxPrice`):**
  - Hỗ trợ đơn vị `tỷ`, `ty`, `tỉ`, `b`, `billion` (`× 1.000.000.000`) và `triệu`, `trieu`, `tr`, `m`, `million` (`× 1.000.000`). Chặn không nhận nhầm chữ `m` trong `m²`/`m2`.
  - Hỗ trợ khoảng giá ("từ 3 đến 5 tỷ", "15-25 triệu"), cận trên ("dưới 8 tỷ", "under 8B"), cận dưới ("trên 5 tỷ", "over 5B"), và ước lượng ("khoảng 6 tỷ").
- **Diện tích (`minArea`, `maxArea`):**
  - Hỗ trợ `m2`, `m²`, `sqm`, `sq m` (ví dụ: "trên 70m2", "80-120 m²", "over 60 sqm").
- **Địa điểm (`province`, `district`):**
  - Chuẩn hóa các tỉnh/thành phố lớn (Hà Nội, Hồ Chí Minh / TP.HCM / Sài Gòn, Đà Nẵng, Bình Dương, Đồng Nai, Cần Thơ, Hải Phòng, Khánh Hòa, Lâm Đồng...) và các quận/huyện phổ biến (`Quận 1`..`Quận 12`, `District 1`..`District 12`, `Thủ Đức`, `Tây Hồ`, `Cầu Giấy`, `Hải Châu`...).

### 2.4 Cơ chế truy vấn dự phòng (Fallback Relaxation)
Khi truy vấn chặt chẽ trả về `0` kết quả:
1. Bỏ điều kiện giá/diện tích/quận, giữ lại `transactionType`, `propertyType`, `province`.
2. Nếu vẫn `0` kết quả, giữ lại `transactionType` hoặc lấy các tin `APPROVED` mới nhất (`limit: 4`).
3. Đặt cờ `isFallback = true` và thông báo rõ ràng trong câu trả lời rằng không tìm thấy tin khớp chính xác, đồng thời hiển thị các tin đã kiểm duyệt gần nhất.

---

## 3. GIAO DIỆN TRỢ LÝ AI (`AiAssistantWidget.tsx`)

### 3.1 Tích hợp & Trải nghiệm người dùng
- Được tích hợp toàn cục trong `frontend/src/app/[locale]/layout.tsx` bên trong `AuthProvider`.
- **Nút mở nổi (`data-testid="ai-assistant-toggle"`):** Đặt cố định góc dưới bên phải (`fixed bottom-5 right-5 z-40`), không che khuất thanh điều hướng chính.
- **Khung hội thoại (`data-testid="ai-assistant-panel"`):**
  - Desktop (`1440x900`): Cửa sổ nổi `w-[400px] h-[min(600px,calc(100vh-6.5rem))]`.
  - Mobile (`390x844`): Co giãn linh hoạt `w-[calc(100vw-1.5rem)]`, bảo đảm không tràn ngang (`scrollWidth <= clientWidth`).
  - Hỗ trợ phím `Escape` để đóng cửa sổ và trả focus về nút mở.
  - Hiển thị thông báo minh bạch (`disclaimer`), lời chào (`welcomeMessage`), 4 gợi ý tìm nhanh (`ai-assistant-suggestion`), bộ đếm ký tự (`500`), nút xóa hội thoại (`ai-assistant-clear`), trạng thái đang tải và nút thử lại khi gặp lỗi (`ai-assistant-retry`).
- **Thẻ tin đăng gợi ý (`data-testid="ai-recommendation-card"`):**
  - Hiển thị ảnh đại diện (dùng `<Image unoptimized />` hoặc icon fallback), tiêu đề, giá VND đã định dạng (`formatVndPrice`), diện tích (`formatArea`) và địa chỉ hành chính (`formatAdministrativeLocation`).
  - Liên kết trực tiếp tới trang chi tiết `/[locale]/bat-dong-san/[id]`.
- **Đa ngôn ngữ (`vi.json` & `en.json`):** Toàn bộ nhãn, gợi ý và thông báo đều được quản lý đối xứng qua namespace `AiAssistant`.

---

## 4. QUY TRÌNH KIỂM THỬ & XÁC MINH

```bash
# Kiểm thử đơn vị & tích hợp Frontend (bao gồm ai-assistant.test.tsx & bff-assistant.test.ts)
npm --prefix frontend test -- --run
# Kết quả: 21/21 test files passed, 221/221 tests passed

# Kiểm thử Backend
npm --prefix backend test
# Kết quả: 6/6 test files passed, 148/148 tests passed

# Kiểm tra Linting
npm --prefix frontend run lint   # 0 errors, 0 warnings
npm --prefix backend run lint    # 0 errors, 0 warnings

# Production Builds
npm --prefix backend run build   # Exit code 0
npm --prefix frontend run build  # 48/48 routes generated, Exit code 0
```
