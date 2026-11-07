# Hướng dẫn Thiết lập và Khởi chạy Cơ sở dữ liệu Batdongsan (Phase 2A)

Tài liệu này hướng dẫn cách cấu hình, kết nối cơ sở dữ liệu PostgreSQL 16 cục bộ trên Windows, áp dụng migration Prisma và nạp dữ liệu mẫu (seed data) cho môi trường phát triển.

---

## 1. Yêu cầu Tiền quyết (Prerequisites)

Dự án sử dụng dịch vụ **PostgreSQL 16 native trên Windows** chạy tại cổng mặc định `5432`:
1. Cài đặt PostgreSQL 16 trên Windows (Service: `postgresql-x64-16`).
2. Mở `pgAdmin` hoặc `psql` để tạo cơ sở dữ liệu `batdongsan`:
   ```sql
   CREATE DATABASE batdongsan WITH OWNER = postgres ENCODING = 'UTF8';
   ```
3. Xác nhận dịch vụ đang chạy trên cổng `5432`:
   ```powershell
   Test-NetConnection 127.0.0.1 -Port 5432
   ```

---

## 2. Cấu hình Biến Môi trường (.env)

Tại thư mục `database/`, sao chép tệp `.env.example` thành `.env`:
```powershell
Copy-Item .env.example .env
```
Cập nhật mật khẩu thực tế vào tệp `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/batdongsan?schema=public"
SEED_DEMO_PASSWORD="YourSecureDemoPassword2026!"
```
*Lưu ý: Tệp `.env` đã được cấu hình trong `.gitignore` và tuyệt đối không được đưa lên Git.*

---

## 3. Khởi tạo và Áp dụng Migration

Tại thư mục `database/`:
1. Kiểm tra tính hợp lệ của schema:
   ```bash
   npm run prisma:validate
   ```
2. Kiểm tra trạng thái và áp dụng migration:
   ```bash
   npx prisma migrate status
   npx prisma migrate deploy
   ```

---

## 4. Nạp Dữ liệu Mẫu (Seed Data)

Script nạp dữ liệu mẫu bảo đảm tính **lũy đễnh (idempotent)** (có thể chạy nhiều lần mà không tạo bản ghi trùng lặp và không xóa dữ liệu người dùng) cùng cơ chế bảo mật (mật khẩu được băm bằng `bcryptjs` 10 rounds, đọc từ biến môi trường `SEED_DEMO_PASSWORD`):

Khởi chạy lệnh seed:
```bash
npx prisma db seed
```

Dữ liệu mẫu khởi tạo bao gồm:
- **5 tài khoản phát triển xác định:** `admin@example.test` (ADMIN), `owner@example.test` (OWNER), `buyer@example.test` (BUYER), `agent_a@example.test` (AGENT), `agent_b@example.test` (AGENT).
- **10 tin đăng bất động sản mẫu:** 6 APPROVED, 2 PENDING, 1 DRAFT, 1 REJECTED (phân bổ `FOR_SALE` và `FOR_RENT` đủ chu kỳ thuê `MONTH`, `QUARTER`, `YEAR`).
- **3 bản ghi chia sẻ MLS nội bộ:** quyền VIEW, MANAGE và lịch sử thu hồi (`isActive = false`).
- **2 yêu cầu liên hệ và phân công môi giới:** có xác nhận đồng ý (`contactConsent = true`) và lịch sử chuyển giao điều phối môi giới.
