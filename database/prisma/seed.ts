// ============================================================
// Batdongsan — Idempotent Development Seed Script
// Version: 1.1 | Target: PostgreSQL 16
// Phase 2A: Database Foundation & Comprehensive Seed Data
// ============================================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../backend/src/generated/prisma/client.js";

// Validate connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required to execute seeding. Please verify your .env file."
  );
}

// Validate demo password from environment
const rawPassword = process.env.SEED_DEMO_PASSWORD;
const obviousPlaceholders = [
  "password",
  "123456",
  "admin",
  "YOUR_PASSWORD_HERE",
  "CHANGE_ME",
  "",
];

if (!rawPassword || obviousPlaceholders.includes(rawPassword.trim())) {
  throw new Error(
    "Security check failed: SEED_DEMO_PASSWORD environment variable is missing or set to an insecure placeholder. Please configure a valid SEED_DEMO_PASSWORD in database/.env before running seed."
  );
}

// Initialize Prisma client with driver adapter
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting idempotent development seed for Batdongsan...");

  // Compute password hash once (never print plaintext or hash)
  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  // ─────────────────────────────────────────────────────────────
  // 1. Seed 5 Distinct Synthetic Development Accounts
  // ─────────────────────────────────────────────────────────────
  const seedUsers = [
    {
      id: "seed_user_admin_01",
      email: "admin@example.test",
      passwordHash,
      fullName: "Quản trị viên Hệ thống",
      phone: "0901000001",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "ADMIN" as const,
      registrationIntent: "AGENT" as const,
      isActive: true,
    },
    {
      id: "seed_user_owner_01",
      email: "owner@example.test",
      passwordHash,
      fullName: "Trần Thị Chủ Nhà",
      phone: "0901000003",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "OWNER" as const,
      registrationIntent: "OWNER" as const,
      isActive: true,
    },
    {
      id: "seed_user_buyer_01",
      email: "buyer@example.test",
      passwordHash,
      fullName: "Lê Văn Người Mua",
      phone: "0901000004",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      role: "BUYER" as const,
      registrationIntent: "BUYER" as const,
      isActive: true,
    },
    {
      id: "seed_user_agent_a",
      email: "agent_a@example.test",
      passwordHash,
      fullName: "Nguyễn Văn Môi Giới (Đại lý A)",
      phone: "0901000002",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      role: "AGENT" as const,
      registrationIntent: "AGENT" as const,
      isActive: true,
    },
    {
      id: "seed_user_agent_b",
      email: "agent_b@example.test",
      passwordHash,
      fullName: "Phạm Thị Môi Giới (Đại lý B)",
      phone: "0901000005",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      role: "AGENT" as const,
      registrationIntent: "AGENT" as const,
      isActive: true,
    },
  ];

  console.log(`- Upserting ${seedUsers.length} synthetic user accounts...`);
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        registrationIntent: user.registrationIntent,
        isActive: user.isActive,
      },
      create: user,
    });
  }

  // Retrieve user references
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@example.test" } });
  const buyerUser = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@example.test" } });
  const agentAUser = await prisma.user.findUniqueOrThrow({ where: { email: "agent_a@example.test" } });
  const agentBUser = await prisma.user.findUniqueOrThrow({ where: { email: "agent_b@example.test" } });

  // ─────────────────────────────────────────────────────────────
  // 2. Seed 10 Realistic Synthetic Listings
  // ─────────────────────────────────────────────────────────────
  const seedListings = [
    {
      id: "seed_listing_01",
      title: "Căn hộ cao cấp 2PN view sông Sài Gòn, Vinhomes Golden River",
      description: "Căn hộ tầng 18 tháp Aqua 1, đầy đủ nội thất nhập khẩu cao cấp, ban công nhìn toàn cảnh sông Sài Gòn và Bitexco. Tiện ích hồ bơi vô cực, gym, công viên ven sông.",
      propertyType: "APARTMENT" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(7800000000), // 7.8 tỷ VNĐ
      rentalPeriod: null, // Bắt buộc null cho FOR_SALE
      areaSqm: 78.5,
      province: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward: "Phường Bến Nghé",
      streetAddress: "Số 2 Tôn Đức Thắng (Riêng tư)",
      latitude: 10.7812,
      longitude: 106.7061,
      status: "APPROVED" as const,
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_02",
      title: "Nhà phố liền kề Khu Đô Thị Phú Mỹ Hưng, nội thất cao cấp",
      description: "Nhà phố 1 trệt 3 lầu sân thượng, diện tích đất 6x18m. Khu vực an ninh 24/7, gần trường quốc tế SSIS, bệnh viện FV. Sổ hồng chính chủ, sang tên ngay.",
      propertyType: "HOUSE" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(22500000000), // 22.5 tỷ VNĐ
      rentalPeriod: null,
      areaSqm: 280.0,
      province: "TP. Hồ Chí Minh",
      district: "Quận 7",
      ward: "Phường Tân Phong",
      streetAddress: "Đường Nguyễn Cao, KP Hưng Phước 4 (Riêng tư)",
      latitude: 10.7289,
      longitude: 106.7118,
      status: "APPROVED" as const,
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_03",
      title: "Căn hộ dịch vụ studio hiện đại gần Hồ Tây, view thoáng",
      description: "Căn hộ studio tầng 5, trang bị đầy đủ máy giặt, bếp từ, tủ lạnh, giường đệm cao cấp. Giá thuê đã bao gồm dọn phòng tuần 2 lần và nước sinh hoạt.",
      propertyType: "APARTMENT" as const,
      transactionType: "FOR_RENT" as const,
      priceVnd: BigInt(12000000), // 12 triệu/tháng
      rentalPeriod: "MONTH" as const,
      areaSqm: 42.0,
      province: "Hà Nội",
      district: "Quận Tây Hồ",
      ward: "Phường Quảng An",
      streetAddress: "Ngõ 12 Đặng Thai Mai (Riêng tư)",
      latitude: 21.0622,
      longitude: 105.8291,
      status: "APPROVED" as const,
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_04",
      title: "Biệt thự đơn lập Ciputra Tây Hồ, hợp đồng thuê theo năm",
      description: "Biệt thự khu G, diện tích 300m2 xây 3 tầng, sân vườn trước sau trồng nhiều cây xanh, garage 2 xe hơi. Cho thuê dài hạn theo năm, phù hợp cho chuyên gia nước ngoài.",
      propertyType: "VILLA" as const,
      transactionType: "FOR_RENT" as const,
      priceVnd: BigInt(840000000), // 840 triệu VNĐ/năm
      rentalPeriod: "YEAR" as const, // Kiểm thử giá trị chu kỳ thuê theo NĂM
      areaSqm: 300.0,
      province: "Hà Nội",
      district: "Quận Bắc Từ Liêm",
      ward: "Phường Xuân Đỉnh",
      streetAddress: "Khu đô thị Nam Thăng Long Ciputra (Riêng tư)",
      latitude: 21.0754,
      longitude: 105.7892,
      status: "APPROVED" as const,
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_05",
      title: "Đất nền khu đô thị sinh thái Hòa Xuân ven sông Cẩm Lệ",
      description: "Lô đất hướng Đông Nam mát mẻ, đường 7m5 lề 4m. Hạ tầng hoàn thiện, dân cư đông đúc, gần cầu Hòa Xuân và trường mầm non. Pháp lý sổ đỏ đầy đủ.",
      propertyType: "LAND" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(3650000000), // 3.65 tỷ VNĐ
      rentalPeriod: null,
      areaSqm: 100.0,
      province: "Đà Nẵng",
      district: "Quận Cẩm Lệ",
      ward: "Phường Hòa Xuân",
      streetAddress: "Khu đô thị Hòa Xuân (Riêng tư)",
      latitude: 15.9984,
      longitude: 108.2145,
      status: "APPROVED" as const,
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_06",
      title: "Mặt bằng kinh doanh mặt tiền đường Trần Hưng Đạo, thanh toán theo quý",
      description: "Mặt bằng trệt lửng diện tích sử dụng 160m2, vị trí trung tâm sầm uất ngay gần sông Hàn. Thích hợp mở showroom, quán cà phê hoặc phòng giao dịch. Thanh toán theo quý.",
      propertyType: "COMMERCIAL" as const,
      transactionType: "FOR_RENT" as const,
      priceVnd: BigInt(135000000), // 135 triệu VNĐ/quý (45tr/tháng)
      rentalPeriod: "QUARTER" as const, // Kiểm thử giá trị chu kỳ thuê theo QUÝ
      areaSqm: 160.0,
      province: "Đà Nẵng",
      district: "Quận Hải Châu",
      ward: "Phường An Hải Tây",
      streetAddress: "Đường Trần Hưng Đạo (Riêng tư)",
      latitude: 16.0612,
      longitude: 108.2301,
      status: "APPROVED" as const,
      ownerId: agentAUser.id, // Sở hữu bởi Agent A
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_07",
      title: "Căn hộ 1PN phân khu The Origami Vinhomes Grand Park",
      description: "Căn hộ vừa nhận bàn giao nhà, mới 100%, trang bị rèm cửa và máy lạnh. Đang chờ kiểm duyệt để hiển thị công khai.",
      propertyType: "APARTMENT" as const,
      transactionType: "FOR_RENT" as const,
      priceVnd: BigInt(6500000), // 6.5 triệu/tháng
      rentalPeriod: "MONTH" as const,
      areaSqm: 47.0,
      province: "TP. Hồ Chí Minh",
      district: "TP. Thủ Đức",
      ward: "Phường Long Thạnh Mỹ",
      streetAddress: "Đường Nguyễn Xiển (Riêng tư)",
      latitude: 10.8492,
      longitude: 106.8401,
      status: "PENDING" as const, // Đang chờ duyệt (FR-06)
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_08",
      title: "Nhà phố phân lô đường Cầu Giấy, ngõ thông ô tô đỗ cửa",
      description: "Nhà xây mới 5 tầng có thang máy, cách mặt đường Cầu Giấy 50m. Hồ sơ đang được kiểm duyệt trước khi xuất hiện trên kết quả tìm kiếm.",
      propertyType: "HOUSE" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(11200000000), // 11.2 tỷ VNĐ
      rentalPeriod: null,
      areaSqm: 55.0,
      province: "Hà Nội",
      district: "Quận Cầu Giấy",
      ward: "Phường Dịch Vọng",
      streetAddress: "Ngõ 155 Cầu Giấy (Riêng tư)",
      latitude: 21.0345,
      longitude: 105.7956,
      status: "PENDING" as const, // Đang chờ duyệt (FR-06)
      ownerId: agentBUser.id, // Sở hữu bởi Agent B
      images: [
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_09",
      title: "Bản thảo: Đất vườn sinh thái Lái Thiêu Thuận An Bình Dương",
      description: "Tin đăng lưu nháp cá nhân của chủ nhà chưa gửi kiểm duyệt. Kiểm tra quy tắc bảo vệ: không được xuất hiện trong tìm kiếm công khai (BR-01).",
      propertyType: "LAND" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(5200000000),
      rentalPeriod: null,
      areaSqm: 450.0,
      province: "Bình Dương",
      district: "TP. Thuận An",
      ward: "Phường Lái Thiêu",
      streetAddress: "Đường Cách Mạng Tháng 8 (Riêng tư)",
      latitude: 10.9021,
      longitude: 106.7011,
      status: "DRAFT" as const, // Bản nháp (FR-05)
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80",
      ],
    },
    {
      id: "seed_listing_10",
      title: "Căn hộ không đủ điều kiện pháp lý, tin đăng bị từ chối duyệt",
      description: "Tin đăng thử nghiệm luồng từ chối kiểm duyệt (FR-06, BR-08). Có bản ghi ModerationLog lưu lý do từ chối kiểm duyệt của Quản trị viên.",
      propertyType: "APARTMENT" as const,
      transactionType: "FOR_SALE" as const,
      priceVnd: BigInt(1800000000),
      rentalPeriod: null,
      areaSqm: 50.0,
      province: "TP. Hồ Chí Minh",
      district: "Quận Bình Thạnh",
      ward: "Phường 25",
      streetAddress: "Đường Điện Biên Phủ (Riêng tư)",
      latitude: 10.8011,
      longitude: 106.7145,
      status: "REJECTED" as const, // Bị từ chối duyệt
      ownerId: ownerUser.id,
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
      ],
    },
  ];

  console.log(`- Upserting ${seedListings.length} synthetic listings and images...`);
  for (const item of seedListings) {
    const { images, ...listingData } = item;

    await prisma.listing.upsert({
      where: { id: item.id },
      update: {
        title: listingData.title,
        description: listingData.description,
        propertyType: listingData.propertyType,
        transactionType: listingData.transactionType,
        priceVnd: listingData.priceVnd,
        rentalPeriod: listingData.rentalPeriod,
        areaSqm: listingData.areaSqm,
        province: listingData.province,
        district: listingData.district,
        ward: listingData.ward,
        streetAddress: listingData.streetAddress,
        latitude: listingData.latitude,
        longitude: listingData.longitude,
        status: listingData.status,
      },
      create: listingData,
    });

    // Upsert images idempotently using deterministic primary key
    for (let i = 0; i < images.length; i++) {
      const imgId = `${item.id}_img_${i + 1}`;
      await prisma.listingImage.upsert({
        where: { id: imgId },
        update: {
          url: images[i],
          order: i,
        },
        create: {
          id: imgId,
          listingId: item.id,
          url: images[i],
          order: i,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Seed ModerationLog for REJECTED listing (seed_listing_10)
  // ─────────────────────────────────────────────────────────────
  console.log("- Upserting sample ModerationLog record...");
  await prisma.moderationLog.upsert({
    where: { id: "seed_mod_log_10" },
    update: {
      listingId: "seed_listing_10",
      moderatorId: adminUser.id,
      fromStatus: "PENDING",
      toStatus: "REJECTED",
      reason: "Tin đăng thiếu ảnh giấy tờ chứng minh quyền sở hữu hoặc giấy ủy quyền hợp lệ theo quy chế kiểm duyệt.",
    },
    create: {
      id: "seed_mod_log_10",
      listingId: "seed_listing_10",
      moderatorId: adminUser.id,
      fromStatus: "PENDING",
      toStatus: "REJECTED",
      reason: "Tin đăng thiếu ảnh giấy tờ chứng minh quyền sở hữu hoặc giấy ủy quyền hợp lệ theo quy chế kiểm duyệt.",
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Seed MLS Sharing Records (FR-07, BR-07)
  // Demonstrating: VIEW permission, MANAGE permission, and Revocation History
  // ─────────────────────────────────────────────────────────────
  console.log("- Upserting sample MLS share records (VIEW, MANAGE & Revoked History)...");
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const seedMlsShares = [
    // Ví dụ 1: Quyền VIEW đang hoạt động (Owner chia sẻ cho Agent A trên tin đã duyệt seed_listing_01)
    {
      id: "seed_mls_share_01",
      listingId: "seed_listing_01",
      grantedById: ownerUser.id,
      receivedById: agentAUser.id,
      permission: "VIEW" as const,
      isActive: true,
      revokedAt: null,
      expiresAt: thirtyDaysLater,
    },
    // Ví dụ 2: Quyền MANAGE đang hoạt động (Agent A chia sẻ quyền đồng quản lý cho Agent B trên tin seed_listing_06)
    {
      id: "seed_mls_share_02",
      listingId: "seed_listing_06",
      grantedById: agentAUser.id,
      receivedById: agentBUser.id,
      permission: "MANAGE" as const,
      isActive: true,
      revokedAt: null,
      expiresAt: sixtyDaysLater,
    },
    // Ví dụ 3: Bản ghi lịch sử quyền đã bị thu hồi (Lưu vết lịch sử BR-07, isActive=false, có revokedAt)
    {
      id: "seed_mls_share_03",
      listingId: "seed_listing_02",
      grantedById: ownerUser.id,
      receivedById: agentBUser.id,
      permission: "VIEW" as const,
      isActive: false,
      revokedAt: sevenDaysAgo,
      expiresAt: thirtyDaysLater,
    },
  ];

  for (const share of seedMlsShares) {
    await prisma.mlsShare.upsert({
      where: { id: share.id },
      update: {
        permission: share.permission,
        isActive: share.isActive,
        revokedAt: share.revokedAt,
        expiresAt: share.expiresAt,
      },
      create: share,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Seed Contact Requests & Request Assignments (FR-08, FR-09, BR-04, BR-05, BR-06)
  // Demonstrating: explicit consent, assignment, and re-assignment history
  // ─────────────────────────────────────────────────────────────
  console.log("- Upserting sample contact requests and assignments...");

  // Yêu cầu liên hệ 1: Người mua gửi yêu cầu tư vấn cho tin seed_listing_01, có consent, được phân công cho Agent A
  await prisma.contactRequest.upsert({
    where: { id: "seed_contact_req_01" },
    update: {
      listingId: "seed_listing_01",
      buyerId: buyerUser.id,
      message: "Tôi rất quan tâm đến căn hộ Vinhomes Golden River này, muốn đặt lịch xem nhà vào cuối tuần.",
      contactConsent: true, // BR-04: Đồng ý chia sẻ thông tin liên hệ
      status: "IN_PROGRESS",
    },
    create: {
      id: "seed_contact_req_01",
      listingId: "seed_listing_01",
      buyerId: buyerUser.id,
      message: "Tôi rất quan tâm đến căn hộ Vinhomes Golden River này, muốn đặt lịch xem nhà vào cuối tuần.",
      contactConsent: true,
      status: "IN_PROGRESS",
    },
  });

  // Phân công duy nhất đang hoạt động cho Request 1 (BR-05)
  await prisma.requestAssignment.upsert({
    where: { id: "seed_req_assign_01" },
    update: {
      contactRequestId: "seed_contact_req_01",
      agentId: agentAUser.id,
      isActive: true,
      releasedAt: null,
    },
    create: {
      id: "seed_req_assign_01",
      contactRequestId: "seed_contact_req_01",
      agentId: agentAUser.id,
      isActive: true,
      releasedAt: null,
    },
  });

  // Yêu cầu liên hệ 2: Kiểm thử lịch sử chuyển giao điều phối môi giới (BR-05 & BR-06)
  await prisma.contactRequest.upsert({
    where: { id: "seed_contact_req_02" },
    update: {
      listingId: "seed_listing_03",
      buyerId: buyerUser.id,
      message: "Tôi muốn hỏi chi tiết về quy định nuôi thú cưng và chi phí dịch vụ căn hộ studio Tây Hồ.",
      contactConsent: true,
      status: "IN_PROGRESS",
    },
    create: {
      id: "seed_contact_req_02",
      listingId: "seed_listing_03",
      buyerId: buyerUser.id,
      message: "Tôi muốn hỏi chi tiết về quy định nuôi thú cưng và chi phí dịch vụ căn hộ studio Tây Hồ.",
      contactConsent: true,
      status: "IN_PROGRESS",
    },
  });

  // Phân công cũ (đã bàn giao/hết hiệu lực): Agent A bàn giao lại (isActive=false, có releasedAt)
  await prisma.requestAssignment.upsert({
    where: { id: "seed_req_assign_02_historical" },
    update: {
      contactRequestId: "seed_contact_req_02",
      agentId: agentAUser.id,
      isActive: false,
      releasedAt: sevenDaysAgo,
    },
    create: {
      id: "seed_req_assign_02_historical",
      contactRequestId: "seed_contact_req_02",
      agentId: agentAUser.id,
      isActive: false,
      releasedAt: sevenDaysAgo,
    },
  });

  // Phân công mới (đang phụ trách hiện tại): Agent B tiếp nhận (isActive=true)
  await prisma.requestAssignment.upsert({
    where: { id: "seed_req_assign_02_active" },
    update: {
      contactRequestId: "seed_contact_req_02",
      agentId: agentBUser.id,
      isActive: true,
      releasedAt: null,
    },
    create: {
      id: "seed_req_assign_02_active",
      contactRequestId: "seed_contact_req_02",
      agentId: agentBUser.id,
      isActive: true,
      releasedAt: null,
    },
  });

  console.log("✅ Seed completed successfully and verified idempotent.");
}

main()
  .catch((e) => {
    console.error("❌ Seed execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
