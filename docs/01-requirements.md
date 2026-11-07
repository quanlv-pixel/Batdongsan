# TÀI LIỆU PHÂN TÍCH YÊU CẦU PHẦN MỀM

## Dự án: Batdongsan – Website tìm kiếm và quản lý bất động sản tích hợp MLS nội bộ

- **Phiên bản:** 0.1
- **Ngày tạo:** 19/10/2026
- **Trạng thái:** Bản nháp phân tích yêu cầu

## 1. Giới thiệu dự án

### 1.1. Bối cảnh

Thị trường bất động sản có nhu cầu lớn về việc đăng tin, tìm kiếm, quản lý và trao đổi thông tin giữa người mua, người bán và nhân viên môi giới. Tuy nhiên, thông tin bất động sản có thể bị trùng lặp, thiếu nhất quán hoặc khó kiểm chứng. Người tìm mua cũng cần một cách thuận tiện để lọc bất động sản theo giá, vị trí, diện tích và loại hình.

Dự án Batdongsan hướng đến việc xây dựng một website hỗ trợ tìm kiếm bất động sản, quản lý tin đăng và trao đổi yêu cầu liên hệ giữa người có nhu cầu với nhân viên môi giới.

### 1.2. Mục tiêu

- Xây dựng website có giao diện hiện đại, dễ sử dụng và tương thích với máy tính.
- Cho phép tìm kiếm và lọc bất động sản theo các tiêu chí phổ biến.
- Hỗ trợ người dùng có quyền đăng, chỉnh sửa và quản lý tin bất động sản.
- Xây dựng hệ thống MLS nội bộ để quản lý và chia sẻ tin đăng giữa các tài khoản đủ quyền.
- Hỗ trợ gửi yêu cầu tư vấn hoặc xem bất động sản.
- Hỗ trợ quản trị viên kiểm duyệt tin đăng và quản lý tài khoản.
- Lưu trữ dữ liệu có cấu trúc và áp dụng các biện pháp bảo vệ thông tin cá nhân.

### 1.3. Phạm vi dự án

Dự án là sản phẩm học thuật được xây dựng và kiểm thử bằng dữ liệu mẫu hoặc dữ liệu được phép sử dụng.

MLS trong phạm vi đồ án là mô-đun chia sẻ và quản lý tin đăng nội bộ. Phiên bản đầu tiên không tích hợp trực tiếp với các hệ thống MLS bên ngoài và không mặc định có quyền truy cập dữ liệu độc quyền của các nền tảng bất động sản khác.

## 2. Đối tượng sử dụng

### 2.1. Khách truy cập (Visitor)

- Xem danh sách bất động sản đã được duyệt.
- Tìm kiếm và lọc bất động sản.
- Xem thông tin công khai của từng bất động sản.
- Đăng ký hoặc đăng nhập để sử dụng các chức năng yêu cầu tài khoản.

### 2.2. Người mua (Buyer)

- Thực hiện các chức năng dành cho khách truy cập.
- Gửi yêu cầu tư vấn hoặc đăng ký lịch xem bất động sản.
- Đồng ý hoặc không đồng ý với việc chia sẻ thông tin liên hệ theo thông báo của hệ thống.
- Theo dõi trạng thái yêu cầu nếu chức năng này được triển khai.

### 2.3. Chủ sở hữu (Owner)

- Tạo và quản lý hồ sơ bất động sản của mình.
- Tạo, cập nhật và gửi tin đăng để kiểm duyệt.
- Theo dõi trạng thái duyệt tin.
- Chỉ được thao tác với dữ liệu thuộc phạm vi quyền hạn của mình.

### 2.4. Nhân viên môi giới (Agent)

- Quản lý các tin đăng được phép phụ trách.
- Truy cập mô-đun MLS nội bộ theo quyền được cấp.
- Chia sẻ hoặc tiếp nhận tin theo quy tắc của hệ thống.
- Tiếp nhận và xử lý yêu cầu tư vấn được phân công.
- Theo dõi trạng thái yêu cầu được giao.

### 2.5. Quản trị viên (Admin)

- Quản lý tài khoản và vai trò.
- Kiểm duyệt, chấp thuận hoặc từ chối tin đăng.
- Theo dõi lịch sử thay đổi trạng thái.
- Quản lý quyền truy cập MLS nội bộ.
- Theo dõi hoạt động phân phối và xử lý yêu cầu tư vấn.

## 3. Yêu cầu chức năng

### FR-01: Xác thực và phân quyền

Hệ thống cho phép đăng ký, đăng nhập và đăng xuất. Chức năng và dữ liệu người dùng được truy cập phải phụ thuộc vào vai trò và quyền hạn tương ứng.

### FR-02: Tìm kiếm bất động sản

Người dùng có thể tìm bất động sản theo từ khóa, khu vực, loại hình, mức giá, diện tích và mục đích mua hoặc thuê.

### FR-03: Xem chi tiết bất động sản

Hệ thống hiển thị hình ảnh, mô tả, giá, diện tích, loại hình, khu vực và trạng thái tin đăng. Thông tin địa chỉ riêng tư không được trả về cho người dùng công khai nếu chưa được phép.

### FR-04: Quản lý hồ sơ bất động sản

Chủ sở hữu hoặc người được ủy quyền có thể tạo, xem, sửa và quản lý hồ sơ bất động sản theo quyền hạn của mình.

### FR-05: Quản lý tin đăng

Người có quyền có thể tạo tin đăng, cập nhật nội dung và gửi yêu cầu kiểm duyệt. Tin chưa được duyệt không được hiển thị công khai như tin đã được chấp thuận.

### FR-06: Kiểm duyệt tin đăng

Quản trị viên có thể xem các tin chờ duyệt, chấp thuận hoặc từ chối tin và ghi nhận lý do khi cần thiết.

### FR-07: MLS nội bộ

Hệ thống cho phép chia sẻ và quản lý tin đăng bất động sản nội bộ giữa các tài khoản đủ điều kiện (`APPROVED` listings) với các chính sách công bố thông tin (allowlist) được phân cấp chặt chẽ phía máy chủ:

1. **Quyền sở hữu và phân quyền độc lập với vai trò (AGENT-as-Owner):**
   - Quyền sở hữu tin gắn liền với danh tính người tạo (`listing.ownerId === caller.id`), không chỉ phụ thuộc vai trò `OWNER`. Người dùng vai trò `AGENT` hoàn toàn có thể sở hữu tin đăng.
   - Một `AGENT` sở hữu tin đăng X vẫn có thể nhận quyền chia sẻ MLS cho tin đăng Y (hai tư cách này không loại trừ lẫn nhau).
   - Chỉ chủ sở hữu tin mới có quyền cấp chia sẻ (`POST /api/mls/shares`). Môi giới nhận quyền (`recipient`) tuyệt đối không được phép tái chia sẻ (re-share), không được thu hồi quyền hoặc xem lịch sử chia sẻ của người khác.

2. **Chính sách công bố thông tin (Disclosure Allowlist) đã phê duyệt:**
   - **Chủ sở hữu tin (`ownerId`) và Quản trị viên (`ADMIN`):** Có toàn quyền xem đầy đủ thông tin nội bộ (`streetAddress`, `latitude`, `longitude`) và thông tin liên hệ của chủ tin (`owner: { id, fullName, email, phone }`). Giữ nguyên các hạn chế kiểm duyệt và sửa đổi hiện có. Tuyệt đối không để lộ mật khẩu băm (`passwordHash`) hoặc nhật ký kiểm duyệt nội bộ (`moderationLogs`).
   - **Môi giới nhận quyền `VIEW`:** Được xem các thông tin tin đăng cơ bản và vị trí cấp Tỉnh/Thành, Quận/Huyện, Phường/Xã. **Tuyệt đối không nhận** địa chỉ cụ thể (`streetAddress`), tọa độ chính xác (`latitude`, `longitude`) và thông tin liên hệ của chủ tin (`owner.email`, `owner.phone`). `VIEW` phục vụ mục đích chính là danh sách cộng tác/tuyển chọn (curation) các tin được ủy quyền chia sẻ một cách có tổ chức; không bịa đặt thêm các trường dữ liệu mật khác để phân biệt với dữ liệu công khai.
   - **Môi giới nhận quyền `MANAGE`:** Được xem các thông tin như quyền `VIEW` kèm theo địa chỉ cụ thể (`streetAddress`) và tọa độ chính xác (`latitude`, `longitude`). **Tuyệt đối không nhận** email và số điện thoại của chủ tin (`owner.email`, `owner.phone`).
   - **Bảo vệ quyền riêng tư từ máy chủ:** Các trường bị hạn chế được lược bỏ hoàn toàn ở tầng máy chủ (caller-specific allowlist), không tải bản ghi đầy đủ về rồi ẩn ở frontend.

3. **Trì hoãn chỉnh sửa đối với quyền `MANAGE` (Deferred Editing):**
   - Quyền `MANAGE` ở phạm vi MVP hiện tại là quyền truy cập thông tin nội bộ có giới hạn (địa chỉ/tọa độ chi tiết), không bao gồm quyền chỉnh sửa, can thiệp kiểm duyệt, thay đổi quyền sở hữu hay tái chia sẻ.
   - Tính năng chỉnh sửa tin của `MANAGE` (Revision Workflow) được hoãn lại để thiết kế quy trình kiểm duyệt lại chặt chẽ ở các giai đoạn sau.

4. **Quy trình liên hệ môi giới - chủ tin (Broker-to-Owner Communication Workflow):**
   - Quy trình Contact Requests/Assignments hiện tại chỉ phục vụ phân phối yêu cầu của khách hàng (Buyer), không cung cấp kênh trao đổi trực tiếp giữa môi giới và chủ nhà.
   - Quy trình liên hệ trực tiếp broker-to-owner được ghi nhận là yêu cầu trong tương lai (Future Requirement); không tự ý triển khai tin nhắn, bộc lộ liên hệ, hoa hồng hoặc cơ chế đồng ý trong phạm vi này.

5. **Các Endpoint chuẩn tắc (Canonical API Routes):**
   - `POST /api/mls/shares`: Chủ sở hữu tin cấp quyền chia sẻ (chỉ áp dụng cho tin `APPROVED`, người nhận là `AGENT` đang hoạt động, không tự chia sẻ cho chính mình).
   - `POST /api/mls/shares/:id/revoke` & `DELETE /api/mls/shares/:id`: Chủ sở hữu hoặc `ADMIN` thu hồi quyền chia sẻ (ghi nhận `AuditLog`).
   - `GET /api/mls/shares/received`: Danh sách tin chia sẻ mà `AGENT` đang đăng nhập được nhận (phân trang, lọc, lược bỏ các trường nhạy cảm theo quyền `VIEW`/`MANAGE`).
   - `GET /api/mls/listings/:id/shares`: Lịch sử chia sẻ của tin đăng (chỉ dành cho chủ tin và `ADMIN`).
   - `GET /api/mls/listings/:id`: Xem chi tiết nội bộ tin đăng (áp dụng allowlist riêng biệt cho Chủ tin/Admin, MANAGE recipient, và VIEW recipient).
   - Các endpoint tin đăng công khai (`/api/listings/*`) giữ nguyên hoàn toàn.

> **Quyết định nghiệp vụ (Stakeholder Decision Note):**
> Thống nhất chính sách phân cấp thông tin MLS MVP:
> - `VIEW` chỉ cung cấp thông tin cấp xã/phường để môi giới nắm giỏ hàng cộng tác, không trả về địa chỉ chính xác, tọa độ và liên hệ chủ nhà.
> - `MANAGE` mở thêm địa chỉ chính xác và tọa độ phục vụ khảo sát thực địa nội bộ, nhưng vẫn bảo mật liên hệ chủ nhà để ngăn ngừa giao dịch tắt ngoài quy trình.
> - Giữ nguyên tính toàn vẹn của mô hình phân quyền và tính tương thích schema enum (`MlsSharePermission: VIEW, MANAGE`).


### FR-08: Yêu cầu tư vấn (Contact Requests)

Người mua có thể gửi yêu cầu tư vấn hoặc xem bất động sản với các quy định bảo vệ dữ liệu và xác thực chặt chẽ:
1. **Đối tượng được phép tạo:**
   - Vai trò được phép: `BUYER`, `OWNER`, `AGENT` đã xác thực.
   - Quản trị viên (`ADMIN`) không được phép tạo yêu cầu tư vấn.
   - Người dùng đóng vai trò `OWNER` hoặc `AGENT` có thể gửi yêu cầu với tư cách người mua tiềm năng cho tin đăng của người khác.
   - **Chống tự gửi yêu cầu:** Nghiêm cấm tạo yêu cầu cho tin đăng do chính mình sở hữu (`listing.ownerId !== caller.id`).
2. **Điều kiện tin đăng:**
   - Chỉ áp dụng cho tin đăng đang ở trạng thái `APPROVED`. Từ chối các tin không tồn tại, tin `DRAFT`, `PENDING`, `REJECTED`.
3. **Đồng ý chia sẻ thông tin liên hệ (Contact Consent):**
   - Trường `contactConsent` là bắt buộc và phải là `true` khi tạo mới. DTO từ chối nếu thiếu hoặc `false`.
   - Cam kết quyền riêng tư: Thông tin liên hệ của người mua (`email`, `phone`) chỉ được bộc lộ cho Môi giới được phân công phụ trách (`assigned AGENT`) và Quản trị viên (`ADMIN`), tuyệt đối không chia sẻ cho chủ sở hữu tin đăng (`OWNER`).
   - Xử lý phòng vệ cho dữ liệu cũ (legacy data): Nếu bản ghi có `contactConsent === false`, môi giới phụ trách cũng sẽ không nhận được email và số điện thoại của người mua.

### FR-09: Phân phối yêu cầu tư vấn tự động (Automatic Agent Assignment)

Hệ thống phân công mỗi yêu cầu cho một nhân viên môi giới đủ điều kiện tại một thời điểm theo chính sách xác định (deterministic MVP policy):
1. **Ưu tiên 1 — Môi giới là chủ sở hữu tin đăng (Listing-owner Agent):**
   - Nếu chủ sở hữu tin (`listing.owner`) có `role === AGENT` và `isActive === true`, tự động phân công cho môi giới này.
2. **Ưu tiên 2 — Môi giới có khối lượng công việc thấp nhất (Lowest Active Workload):**
   - Nếu chủ tin không phải là môi giới đang hoạt động, xét tất cả các tài khoản có `role === AGENT` và `isActive === true`.
   - Tính tải công việc hiện tại dựa trên số lượng bản ghi `RequestAssignment` đang hoạt động (`isActive === true`).
   - Chọn môi giới có số lượng phân công hoạt động ít nhất.
   - Quy tắc giải quyết hòa (tie-breaking):
     1. Tài khoản tạo sớm hơn (`User.createdAt` tăng dần).
     2. Mã người dùng tăng dần (`User.id` tăng dần).
3. **Xử lý khi không có môi giới đủ điều kiện (No Eligible Agent Fallback):**
   - Vẫn tạo yêu cầu tư vấn thành công nhưng giữ trạng thái là `NEW` và không tạo bản ghi `RequestAssignment`.
   - Yêu cầu chưa phân công hiển thị cho `ADMIN` để phân công thủ công qua endpoint `POST /api/contact-requests/:id/assign`.
4. **Phân công lần đầu (First Assignment):**
   - Áp dụng khi yêu cầu đang ở trạng thái `NEW` và chưa có phân công hoạt động.
   - Khi tạo yêu cầu có môi giới tự động, hệ thống tạo bản ghi `RequestAssignment` (`isActive = true`, `assignedAt = now()`) và chuyển trạng thái sang `IN_PROGRESS`.
   - Nếu tạo tự động rơi vào fallback `NEW` (chưa có phân công), `ADMIN` phân công thủ công qua `POST /api/contact-requests/:id/assign`.
   - Nếu đã tồn tại phân công hoạt động, `POST /:id/assign` trả về `409 Conflict`.
5. **Điều phối lại (Reassignment):**
   - Chỉ `ADMIN` có quyền điều phối lại qua `POST /api/contact-requests/:id/reassign`.
   - Bắt buộc yêu cầu phải đang có một phân công hoạt động (`isActive === true`). Nếu chưa có phân công nào, API trả về `409 Conflict` kèm thông điệp hướng dẫn sử dụng endpoint `/assign`.
   - Nghiêm cấm điều phối lại cho chính môi giới đang phụ trách hiện tại (`400 Bad Request`) hoặc điều phối lại trên yêu cầu đã kết thúc (`400 Bad Request`).
   - Trong một giao dịch cơ sở dữ liệu duy nhất: giải phóng phân công cũ (`isActive = false`, `releasedAt = now()`), tạo phân công mới (`isActive = true`), giữ trạng thái `IN_PROGRESS`, ghi nhật ký `AuditLog` và thu hồi ngay lập tức quyền truy cập của môi giới cũ.
   - Ràng buộc chỉ mục một phần PostgreSQL (`request_assignments_contactRequestId_key` với `WHERE ("isActive" = true)`) đảm bảo tính toàn vẹn tuyệt đối ở tầng cơ sở dữ liệu. Xung đột ghi đồng thời được bắt chính xác và trả về `409 Conflict`.

### FR-10: Quản lý trạng thái và mở lại yêu cầu (State Machine & Reopen Workflow)

Trạng thái yêu cầu tư vấn bao gồm: `NEW`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`.
1. **Ma trận chuyển đổi trạng thái hợp lệ (Status Transition Matrix):**
   - `NEW` -> `REJECTED`: Chỉ `ADMIN` được phép từ chối yêu cầu chưa phân công.
   - `NEW` -> `IN_PROGRESS`: Nghiêm cấm qua `PATCH /:id/status` (phải thông qua quy trình phân công `assignAgent`).
   - `NEW` -> `COMPLETED`: Bị cấm (`400 Bad Request`).
   - `IN_PROGRESS` -> `COMPLETED`: Môi giới đang được phân công hoạt động hoặc `ADMIN`.
   - `IN_PROGRESS` -> `REJECTED`: Môi giới đang được phân công hoạt động hoặc `ADMIN`.
   - `IN_PROGRESS` -> `NEW`: Bị cấm tuyệt đối (`400 Bad Request`).
   - Cập nhật trạng thái trùng với trạng thái hiện tại: Bị từ chối (`400 Bad Request`).
   - Các trạng thái `COMPLETED` và `REJECTED` là trạng thái kết thúc (terminal states). Mọi yêu cầu chuyển đổi qua `PATCH /:id/status` đều bị từ chối; bắt buộc phải sử dụng quy trình mở lại dành riêng cho `ADMIN`.
   - Cập nhật trạng thái sử dụng cập nhật có điều kiện (`conditional update`) trong giao dịch để ngăn chặn triệt để ghi đè do tranh chấp đồng thời (`race conditions`).
2. **Quy trình mở lại yêu cầu dành riêng cho Quản trị viên (ADMIN Reopen Workflow):**
   - Chỉ `ADMIN` được phép gọi endpoint `POST /api/contact-requests/:id/reopen`.
   - Yêu cầu lý do mở lại (`reason`) bắt buộc, được cắt khoảng trắng và không được để trống.
   - Cơ chế khôi phục: Nếu vẫn còn phân công hoạt động tới môi giới hợp lệ, khôi phục về `IN_PROGRESS`. Nếu không, chuyển về `NEW` và chạy thuật toán phân công tự động; nếu vẫn không có môi giới thì giữ `NEW` chờ phân công thủ công.
   - Toàn bộ thao tác thực hiện trong giao dịch và ghi nhật ký `AuditLog`.
3. **Chính sách công bố thông tin (Privacy Allowlists):**
   - **Người mua (Buyer):** Chỉ xem các yêu cầu của chính mình (`buyerId === caller.id`), nội dung tin nhắn và tóm tắt thông tin môi giới phụ trách (`id`, `name`, `phone` — không lộ email của môi giới).
   - **Môi giới phụ trách (Assigned Agent):** Chỉ truy cập được yêu cầu khi đang có phân công hoạt động (`isActive === true`). Xem được họ tên người mua; chỉ xem email/sđt nếu `contactConsent === true`. Khi bị điều phối lại hoặc phân công bị hủy (`isActive === false`), mất quyền truy cập ngay lập tức (`403 Forbidden`).
   - **Chủ sở hữu tin đăng (Listing Owner):** Xem danh sách yêu cầu liên quan đến tin đăng của mình (`GET /api/contact-requests/for-owned-listings`) nhưng chỉ nhận danh sách rút gọn siêu dữ liệu (Metadata-only allowlist: `id`, `listingId`, `status`, `createdAt`, `updatedAt`, tóm tắt tin). **Tuyệt đối không nhận** họ tên, email, sđt, mã người mua, nội dung tin nhắn hoặc lịch sử môi giới.
   - **Quản trị viên (ADMIN):** Xem toàn bộ danh sách, thông tin chi tiết người mua, lịch sử phân công. Lọc danh sách hỗ trợ validate tham số chặt chẽ (từ chối `unassigned` không hợp lệ với 400; từ chối kết hợp đồng thời `agentId` và `unassigned=true` với 400).
   - **Bảo mật thông tin xác thực:** Tuyệt đối không để lộ `passwordHash` trong bất kỳ phản hồi API nào.

### FR-11: Quản lý tài khoản

Quản trị viên có thể xem tài khoản, điều chỉnh vai trò theo quyền được cấp và khóa hoặc mở khóa tài khoản khi cần thiết.

### FR-12: Thống kê cơ bản

Hệ thống có thể hiển thị số lượng tin đăng, tin chờ duyệt, tin đã duyệt và yêu cầu tư vấn theo các tiêu chí phù hợp với vai trò người dùng.

## 4. Yêu cầu phi chức năng

### NFR-01: Bảo mật

Mật khẩu phải được lưu dưới dạng băm an toàn. API cần kiểm tra xác thực, quyền truy cập và dữ liệu đầu vào.

### NFR-02: Quyền riêng tư

Địa chỉ chi tiết và thông tin liên hệ riêng tư phải được bảo vệ ở phía máy chủ. Không chỉ ẩn thông tin bằng giao diện frontend.

### NFR-03: Tính nhất quán dữ liệu

Các thao tác tạo, sửa, xóa và phân công phải bảo đảm tính nhất quán của dữ liệu. Các thao tác liên quan nên được thực hiện trong giao dịch khi phù hợp.

### NFR-04: Khả năng sử dụng

Giao diện dễ hiểu, có trạng thái tải dữ liệu, thông báo lỗi, thông báo thành công và hướng dẫn nhập liệu.

### NFR-05: Khả năng bảo trì

Mã nguồn được chia thành các mô-đun có trách nhiệm rõ ràng; cấu hình và thông tin bí mật không được ghi cứng trong mã nguồn.

### NFR-06: Khả năng kiểm thử

Các chức năng quan trọng cần có trường hợp kiểm thử, đặc biệt là phân quyền, kiểm duyệt tin, bảo vệ địa chỉ và phân phối yêu cầu tư vấn.

## 5. Quy tắc nghiệp vụ

- BR-01: Chỉ tin đăng đã được chấp thuận mới được xuất hiện trong kết quả tìm kiếm công khai.
- BR-02: Người dùng chỉ được sửa hoặc quản lý dữ liệu mà họ sở hữu hoặc được ủy quyền thao tác.
- BR-03: Địa chỉ chính xác của bất động sản không được cung cấp cho khách truy cập công khai nếu chưa được cho phép.
- BR-04: Chỉ chia sẻ thông tin liên hệ của người mua khi có sự đồng ý phù hợp và theo chính sách quyền riêng tư được thông báo.
- BR-05: Mỗi yêu cầu tư vấn chỉ có một nhân viên được phân công xử lý tại một thời điểm.
- BR-06: Việc chuyển yêu cầu sang nhân viên khác phải lưu lịch sử phân công.
- BR-07: MLS nội bộ phải kiểm tra chặt chẽ tính hợp lệ của lượt chia sẻ (active, chưa hết hạn, tin `APPROVED`, chủ tin & người nhận active) trước khi cho phép xem hoặc chia sẻ dữ liệu. Dữ liệu nhạy cảm (địa chỉ chi tiết, tọa độ, thông tin liên hệ chủ nhà) phải tuân thủ nghiêm ngặt chính sách công bố (allowlist) theo vai trò và quyền MLS (`VIEW` vs `MANAGE` vs Owner/Admin); bắt buộc lọc bỏ hoàn toàn ở tầng máy chủ, không tải dữ liệu nhạy cảm xuống client rồi chỉ ẩn bằng frontend.
- BR-08: Các hành động kiểm duyệt quan trọng cần lưu lại người thực hiện, thời điểm và kết quả.

## 6. Phạm vi phiên bản đầu tiên

### Chức năng bắt buộc

- Đăng nhập, đăng xuất và phân quyền cơ bản.
- Danh sách, tìm kiếm, lọc và xem chi tiết bất động sản.
- Tạo và quản lý tin đăng.
- Quy trình kiểm duyệt tin.
- MLS nội bộ với quyền truy cập và lịch sử chia sẻ cơ bản.
- Gửi yêu cầu tư vấn và phân công môi giới.
- Cơ sở dữ liệu và API kết nối frontend với backend.
- Kiểm thử các quy tắc nghiệp vụ quan trọng.

### Chức năng có thể bổ sung sau

- Bản đồ tương tác.
- Thông báo qua email.
- Gói dịch vụ môi giới mô phỏng (Agent subscription-tier matching: phân công theo thứ hạng gói thuê bao được hoãn lại sau MVP).
- Phân công môi giới theo khu vực địa lý (Agent service-area matching: hoãn lại sau MVP do bảng User chưa lưu trữ dữ liệu vùng phục vụ).
- Danh sách bất động sản yêu thích.
- Biểu đồ thống kê nâng cao.
- Tích hợp thanh toán trực tuyến hoặc nguồn dữ liệu MLS bên ngoài.

Các chức năng bổ sung chỉ triển khai khi những chức năng bắt buộc đã hoạt động ổn định.

## 7. Giới hạn và giả định

- Đây là đồ án học thuật, không phải nền tảng giao dịch bất động sản đã được chứng nhận.
- Dữ liệu thử nghiệm phải là dữ liệu mẫu hoặc dữ liệu được phép sử dụng.
- MLS trong bản đầu tiên là mô-đun nội bộ, không đồng nghĩa với việc kết nối hệ thống MLS thực tế.
- Phương thức phân phối yêu cầu tư vấn sẽ được xác định chi tiết trong tài liệu thiết kế.
- Các quyết định về xác minh danh tính, thời hạn lưu trữ dữ liệu và chính sách quyền riêng tư cần được hoàn thiện trước khi triển khai thực tế.

## 8. Tiêu chí nghiệm thu sơ bộ

- Người dùng có thể tìm kiếm và lọc tin đã duyệt.
- Người dùng không có quyền không thể sửa dữ liệu của người khác.
- Tin chờ duyệt không xuất hiện trong danh sách công khai.
- API công khai không trả về địa chỉ riêng tư trái phép.
- Người mua có thể gửi yêu cầu tư vấn và trạng thái đồng ý được ghi nhận.
- Mỗi yêu cầu chỉ có một nhân viên phụ trách tại một thời điểm.
- Các thao tác kiểm duyệt và phân công có lịch sử để kiểm tra.
- Các chức năng chính được kiểm thử và có hướng dẫn chạy dự án.

---

**Ghi chú:** Đây là bản yêu cầu ban đầu. Những yêu cầu và quy tắc có thể được điều chỉnh sau khi thống nhất thiết kế cơ sở dữ liệu, quy trình nghiệp vụ và yêu cầu cụ thể của giảng viên.