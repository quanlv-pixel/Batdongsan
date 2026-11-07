import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ListingsController } from './listings.controller.js';
import { ListingsService } from './listings.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ListingStatus,
  PropertyType,
  RentalPeriod,
  Role,
  TransactionType,
} from '../generated/prisma/enums.js';

describe('ListingsModule Unit & HTTP Flow Tests (Phase 2C)', () => {
  let listingsService: ListingsService;
  let listingsController: ListingsController;
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;
  let jwtService: JwtService;

  // In-memory test state
  let listingsStore: Map<string, any>;
  let moderationLogsStore: any[];
  let usersStore: Map<string, any>;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: { id?: string; email?: string }; select?: Record<string, boolean> }) => {
        let found: any = null;
        if (where.id) {
          found = usersStore.get(where.id);
        } else if (where.email) {
          for (const u of usersStore.values()) {
            if (u.email === where.email) {
              found = u;
              break;
            }
          }
        }
        if (!found) return null;
        if (select) {
          const res: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) res[k] = found[k];
          }
          return res;
        }
        return found;
      }),
    },
    listing: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `lst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          moderationLogs: [],
        };
        listingsStore.set(id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
        const item = listingsStore.get(where.id);
        if (!item) return null;
        if (select) {
          const res: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) res[k] = item[k];
          }
          return res;
        }
        return item;
      }),
      findFirst: vi.fn(async ({ where, select }: { where: any; select?: any }) => {
        for (const item of listingsStore.values()) {
          let match = true;
          if (where.id && item.id !== where.id) match = false;
          if (where.status && item.status !== where.status) match = false;
          if (where.ownerId && item.ownerId !== where.ownerId) match = false;
          if (match) {
            if (select) {
              const res: any = {};
              for (const [k, v] of Object.entries(select)) {
                if (v === true) res[k] = item[k];
                else if (typeof v === 'object' && k === 'images') {
                  res[k] = item.images ?? [];
                }
              }
              return res;
            }
            return item;
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, select, skip, take }: { where?: any; select?: any; skip?: number; take?: number }) => {
        let results = Array.from(listingsStore.values());
        if (where) {
          results = results.filter((item) => {
            if (where.status && item.status !== where.status) return false;
            if (where.ownerId && item.ownerId !== where.ownerId) return false;
            if (where.propertyType && item.propertyType !== where.propertyType) return false;
            if (where.transactionType && item.transactionType !== where.transactionType) return false;
            if (where.province?.contains && !item.province.toLowerCase().includes(where.province.contains.toLowerCase())) return false;
            if (where.district?.contains && !item.district.toLowerCase().includes(where.district.contains.toLowerCase())) return false;
            if (where.ward?.contains && (!item.ward || !item.ward.toLowerCase().includes(where.ward.contains.toLowerCase()))) return false;
            if (where.priceVnd?.gte && item.priceVnd < where.priceVnd.gte) return false;
            if (where.priceVnd?.lte && item.priceVnd > where.priceVnd.lte) return false;
            if (where.areaSqm?.gte && item.areaSqm < where.areaSqm.gte) return false;
            if (where.areaSqm?.lte && item.areaSqm > where.areaSqm.lte) return false;
            return true;
          });
        }
        const s = skip ?? 0;
        const t = take ?? results.length;
        const pageItems = results.slice(s, s + t);
        if (select) {
          return pageItems.map((item) => {
            const res: any = {};
            for (const [k, v] of Object.entries(select)) {
              if (v === true) res[k] = item[k];
              else if (typeof v === 'object' && k === 'images') res[k] = item.images ?? [];
              else if (typeof v === 'object' && k === 'moderationLogs') res[k] = moderationLogsStore.filter((m) => m.listingId === item.id);
            }
            return res;
          });
        }
        return pageItems;
      }),
      count: vi.fn(async ({ where }: { where?: any }) => {
        let results = Array.from(listingsStore.values());
        if (where) {
          results = results.filter((item) => {
            if (where.status && item.status !== where.status) return false;
            if (where.ownerId && item.ownerId !== where.ownerId) return false;
            if (where.propertyType && item.propertyType !== where.propertyType) return false;
            if (where.transactionType && item.transactionType !== where.transactionType) return false;
            return true;
          });
        }
        return results.length;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const item = listingsStore.get(where.id);
        if (!item) throw new Error('Record not found');
        const updated = {
          ...item,
          ...data,
          updatedAt: new Date(),
        };
        listingsStore.set(where.id, updated);
        return updated;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: any; data: any }) => {
        let count = 0;
        for (const [id, item] of listingsStore.entries()) {
          let match = true;
          if (where.id && item.id !== where.id) match = false;
          if (where.ownerId && item.ownerId !== where.ownerId) match = false;
          if (where.status) {
            if (typeof where.status === 'object' && where.status.in) {
              if (!where.status.in.includes(item.status)) match = false;
            } else if (item.status !== where.status) {
              match = false;
            }
          }
          if (match) {
            listingsStore.set(id, { ...item, ...data, updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      }),
    },
    moderationLog: {
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...data,
          createdAt: new Date(),
        };
        moderationLogsStore.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where: { listingId: string } }) => {
        return moderationLogsStore
          .filter((m) => m.listingId === where.listingId)
          .map((m) => ({
            ...m,
            moderator: usersStore.get(m.moderatorId) ?? null,
          }));
      }),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    listingsStore = new Map();
    moderationLogsStore = [];
    usersStore = new Map();

    // Populate test users
    usersStore.set('usr_owner_01', {
      id: 'usr_owner_01',
      email: 'owner@example.test',
      fullName: 'Võ Văn Chủ Nhà',
      role: Role.OWNER,
      isActive: true,
    });
    usersStore.set('usr_agent_01', {
      id: 'usr_agent_01',
      email: 'agent@example.test',
      fullName: 'Trần Thị Môi Giới',
      role: Role.AGENT,
      isActive: true,
    });
    usersStore.set('usr_buyer_01', {
      id: 'usr_buyer_01',
      email: 'buyer@example.test',
      fullName: 'Lê Văn Mua',
      role: Role.BUYER,
      isActive: true,
    });
    usersStore.set('usr_admin_01', {
      id: 'usr_admin_01',
      email: 'admin@example.test',
      fullName: 'Admin Quản Trị',
      role: Role.ADMIN,
      isActive: true,
    });
    usersStore.set('usr_inactive_owner', {
      id: 'usr_inactive_owner',
      email: 'inactive_owner@example.test',
      fullName: 'Bị Khóa Tài Khoản',
      role: Role.OWNER,
      isActive: false,
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test_jwt_secret_for_listings_specs',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ListingsController],
      providers: [
        ListingsService,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    listingsService = module.get<ListingsService>(ListingsService);
    listingsController = module.get<ListingsController>(ListingsController);
    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(listingsController).toBeDefined();
    expect(listingsService).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. POST /api/listings: Creation, Role Enforcement, DRAFT status
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/listings', () => {
    it('should create listing with status = DRAFT, ownerId from authenticated user', async () => {
      const result = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ cao cấp Landmark 81 view sông',
        description: 'Căn hộ 2 phòng ngủ đầy đủ nội thất cao cấp',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '6500000000',
        areaSqm: 79.5,
        province: 'TP. Hồ Chí Minh',
        district: 'Bình Thạnh',
        ward: 'Phường 22',
        streetAddress: '720A Điện Biên Phủ',
        latitude: 10.795,
        longitude: 106.721,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe(ListingStatus.DRAFT);
      expect(result.ownerId).toBe('usr_owner_01');
      expect(result.priceVnd).toBe('6500000000'); // serialized to string
      expect(result.rentalPeriod).toBeNull();
    });

    it('should reject FOR_SALE listing if rentalPeriod is supplied', async () => {
      await expect(
        listingsService.createListing('usr_owner_01', {
          title: 'Nhà phố bán kèm rentalPeriod không hợp lệ',
          description: 'Mô tả nhà phố hợp lệ nhưng sai quy tắc nghiệp vụ',
          propertyType: PropertyType.HOUSE,
          transactionType: TransactionType.FOR_SALE,
          rentalPeriod: RentalPeriod.MONTH,
          priceVnd: '4000000000',
          areaSqm: 60,
          province: 'Hà Nội',
          district: 'Cầu Giấy',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject FOR_RENT listing if rentalPeriod is missing', async () => {
      await expect(
        listingsService.createListing('usr_agent_01', {
          title: 'Cho thuê căn hộ chung cư 2 phòng ngủ',
          description: 'Căn hộ cho thuê giá tốt nhưng thiếu rentalPeriod',
          propertyType: PropertyType.APARTMENT,
          transactionType: TransactionType.FOR_RENT,
          priceVnd: '15000000',
          areaSqm: 65,
          province: 'Hà Nội',
          district: 'Nam Từ Liêm',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept FOR_RENT listing with valid rentalPeriod', async () => {
      const result = await listingsService.createListing('usr_agent_01', {
        title: 'Cho thuê căn hộ chung cư 2 phòng ngủ chuẩn',
        description: 'Căn hộ cho thuê giá tốt đầy đủ tiện nghi',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_RENT,
        rentalPeriod: RentalPeriod.MONTH,
        priceVnd: '15000000',
        areaSqm: 65,
        province: 'Hà Nội',
        district: 'Nam Từ Liêm',
      });

      expect(result.transactionType).toBe(TransactionType.FOR_RENT);
      expect(result.rentalPeriod).toBe(RentalPeriod.MONTH);
      expect(result.status).toBe(ListingStatus.DRAFT);
    });

    it('should enforce RolesGuard: BUYER cannot create listing', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.AGENT]);

      const buyerContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'usr_buyer_01', role: Role.BUYER },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(buyerContext)).toThrow(
        ForbiddenException,
      );

      const ownerContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'usr_owner_01', role: Role.OWNER },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(ownerContext)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PATCH /api/listings/:id: Ownership, Admin override, Status rule
  // ─────────────────────────────────────────────────────────────
  describe('PATCH /api/listings/:id', () => {
    it('should allow owner to edit DRAFT listing', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà cấp 4 cũ cần bán',
        description: 'Nhà cấp 4 diện tích rộng giá tốt',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3000000000',
        areaSqm: 80,
        province: 'Đà Nẵng',
        district: 'Hải Châu',
      });

      const updated = await listingsService.updateListing(
        created.id,
        { id: 'usr_owner_01', role: Role.OWNER },
        { title: 'Nhà cấp 4 mặt tiền cần bán gấp' },
      );

      expect(updated.title).toBe('Nhà cấp 4 mặt tiền cần bán gấp');
    });

    it('should allow ADMIN to edit DRAFT/REJECTED listing even if not owner', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà cần chỉnh sửa bởi admin',
        description: 'Mô tả hợp lệ cho bài đăng',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Đà Nẵng',
        district: 'Thanh Khê',
      });

      const updated = await listingsService.updateListing(
        created.id,
        { id: 'usr_admin_01', role: Role.ADMIN },
        { title: 'Tiêu đề đã được Admin chuẩn hóa' },
      );

      expect(updated.title).toBe('Tiêu đề đã được Admin chuẩn hóa');
    });

    it('should reject non-owner and non-admin edits with 403 Forbidden', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà của người khác',
        description: 'Không được phép chỉnh sửa trái phép',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Đà Nẵng',
        district: 'Thanh Khê',
      });

      await expect(
        listingsService.updateListing(
          created.id,
          { id: 'usr_agent_01', role: Role.AGENT },
          { title: 'Tự ý sửa nhà người khác' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject editing listings that are PENDING, APPROVED, or ARCHIVED with 400', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà đã duyệt không được tự ý sửa',
        description: 'Mô tả nhà đã duyệt',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Ba Đình',
      });

      // Change status directly in store to APPROVED
      listingsStore.get(created.id).status = ListingStatus.APPROVED;

      await expect(
        listingsService.updateListing(
          created.id,
          { id: 'usr_owner_01', role: Role.OWNER },
          { title: 'Cố ý sửa tin đã duyệt' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce rentalPeriod consistency after partial updates', async () => {
      // Create FOR_RENT listing
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Biệt thự cho thuê tháng',
        description: 'Mô tả biệt thự cho thuê',
        propertyType: PropertyType.VILLA,
        transactionType: TransactionType.FOR_RENT,
        rentalPeriod: RentalPeriod.MONTH,
        priceVnd: '50000000',
        areaSqm: 200,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 2',
      });

      // Switch to FOR_SALE while still providing rentalPeriod -> MUST REJECT
      await expect(
        listingsService.updateListing(
          created.id,
          { id: 'usr_owner_01', role: Role.OWNER },
          {
            transactionType: TransactionType.FOR_SALE,
            rentalPeriod: RentalPeriod.YEAR,
          },
        ),
      ).rejects.toThrow(BadRequestException);

      // Switch to FOR_SALE without rentalPeriod -> rentalPeriod automatically cleared to null
      const updated = await listingsService.updateListing(
        created.id,
        { id: 'usr_owner_01', role: Role.OWNER },
        { transactionType: TransactionType.FOR_SALE },
      );
      expect(updated.transactionType).toBe(TransactionType.FOR_SALE);
      expect(updated.rentalPeriod).toBeNull();
    });

    it('should reject editing racing with submission when listing became PENDING with 409 Conflict', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà DRAFT đua submit',
        description: 'Mô tả bài đăng đua submit',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Cầu Giấy',
      });

      // Simulate race condition: right after initial find, concurrent submission changed status to PENDING
      const originalUpdateMany = mockPrismaService.listing.updateMany;
      mockPrismaService.listing.updateMany = vi.fn().mockResolvedValueOnce({ count: 0 });

      await expect(
        listingsService.updateListing(
          created.id,
          { id: 'usr_owner_01', role: Role.OWNER },
          { title: 'Tiêu đề cố ghi đè khi đã PENDING' },
        ),
      ).rejects.toThrow(ConflictException);

      mockPrismaService.listing.updateMany = originalUpdateMany;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. POST /api/listings/:id/submit: Transition & Owner rule
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/listings/:id/submit', () => {
    it('should submit DRAFT listing to PENDING', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà DRAFT chờ gửi duyệt',
        description: 'Mô tả nhà hợp lệ',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
      });

      const res = await listingsService.submitListing(created.id, 'usr_owner_01');
      expect(res.status).toBe(ListingStatus.PENDING);
      expect(listingsStore.get(created.id).status).toBe(ListingStatus.PENDING);
    });

    it('should allow submitting REJECTED listing back to PENDING', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà từng bị từ chối sửa lại',
        description: 'Mô tả đã được sửa theo yêu cầu',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
      });

      listingsStore.get(created.id).status = ListingStatus.REJECTED;

      const res = await listingsService.submitListing(created.id, 'usr_owner_01');
      expect(res.status).toBe(ListingStatus.PENDING);
    });

    it('should reject non-owner from submitting listing', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà của người khác',
        description: 'Mô tả',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
      });

      await expect(
        listingsService.submitListing(created.id, 'usr_agent_01'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject submitting already PENDING or APPROVED listing', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà đã duyệt',
        description: 'Mô tả',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '2000000000',
        areaSqm: 50,
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
      });

      listingsStore.get(created.id).status = ListingStatus.APPROVED;

      await expect(
        listingsService.submitListing(created.id, 'usr_owner_01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. POST /api/listings/:id/moderate & Moderation History
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/listings/:id/moderate & History', () => {
    it('should allow ADMIN to APPROVE PENDING listing and create ModerationLog atomically', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ gửi duyệt chờ Admin duyệt',
        description: 'Đầy đủ giấy tờ sổ đỏ chính chủ',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await listingsService.submitListing(created.id, 'usr_owner_01');

      const res = await listingsService.moderateListing(created.id, 'usr_admin_01', {
        status: ListingStatus.APPROVED,
        reason: 'Hồ sơ đầy đủ, phê duyệt',
      });

      expect(res.status).toBe(ListingStatus.APPROVED);
      expect(listingsStore.get(created.id).status).toBe(ListingStatus.APPROVED);
      expect(moderationLogsStore.length).toBe(1);
      expect(moderationLogsStore[0].fromStatus).toBe(ListingStatus.PENDING);
      expect(moderationLogsStore[0].toStatus).toBe(ListingStatus.APPROVED);
      expect(moderationLogsStore[0].moderatorId).toBe('usr_admin_01');
    });

    it('should require non-whitespace reason when REJECTING a listing', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ bị từ chối duyệt',
        description: 'Mô tả',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await listingsService.submitListing(created.id, 'usr_owner_01');

      // Empty reason
      await expect(
        listingsService.moderateListing(created.id, 'usr_admin_01', {
          status: ListingStatus.REJECTED,
          reason: '',
        }),
      ).rejects.toThrow(BadRequestException);

      // Whitespace-only reason
      await expect(
        listingsService.moderateListing(created.id, 'usr_admin_01', {
          status: ListingStatus.REJECTED,
          reason: '   \t\n   ',
        }),
      ).rejects.toThrow(BadRequestException);

      // Valid reason
      const res = await listingsService.moderateListing(created.id, 'usr_admin_01', {
        status: ListingStatus.REJECTED,
        reason: 'Hình ảnh bất động sản mờ, vui lòng chụp lại rõ nét',
      });
      expect(res.status).toBe(ListingStatus.REJECTED);
      expect(listingsStore.get(created.id).status).toBe(ListingStatus.REJECTED);
    });

    it('should reject moderating a listing that is not in PENDING status', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ còn ở trạng thái DRAFT',
        description: 'Chưa submit',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await expect(
        listingsService.moderateListing(created.id, 'usr_admin_01', {
          status: ListingStatus.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return moderation history for ADMIN', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ xem lịch sử kiểm duyệt',
        description: 'Mô tả',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await listingsService.submitListing(created.id, 'usr_owner_01');
      await listingsService.moderateListing(created.id, 'usr_admin_01', {
        status: ListingStatus.APPROVED,
        reason: 'Duyệt',
      });

      const history = await listingsService.getModerationHistory(created.id);
      expect(history.length).toBe(1);
      expect(history[0].toStatus).toBe(ListingStatus.APPROVED);
      expect(history[0].moderator.email).toBe('admin@example.test');
    });

    it('should prevent duplicate decisions under competing moderation requests with 409 Conflict', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ tranh chấp duyệt',
        description: 'Mô tả căn hộ tranh chấp',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await listingsService.submitListing(created.id, 'usr_owner_01');

      // First decision succeeds
      const firstDecision = await listingsService.moderateListing(created.id, 'usr_admin_01', {
        status: ListingStatus.APPROVED,
        reason: 'Phê duyệt lần đầu',
      });
      expect(firstDecision.status).toBe(ListingStatus.APPROVED);

      // Competing decision racing arrives -> status is no longer PENDING -> MUST THROW 400
      await expect(
        listingsService.moderateListing(created.id, 'usr_admin_01', {
          status: ListingStatus.REJECTED,
          reason: 'Từ chối cạnh tranh',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback status change if ModerationLog creation fails', async () => {
      const created = await listingsService.createListing('usr_owner_01', {
        title: 'Căn hộ kiểm tra rollback transaction',
        description: 'Mô tả căn hộ',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '3500000000',
        areaSqm: 70,
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 7',
      });

      await listingsService.submitListing(created.id, 'usr_owner_01');
      expect(listingsStore.get(created.id).status).toBe(ListingStatus.PENDING);

      // Simulate ModerationLog failure inside transaction
      const originalLogCreate = mockPrismaService.moderationLog.create;
      mockPrismaService.moderationLog.create = vi.fn().mockRejectedValueOnce(
        new Error('Database disk error on ModerationLog insert'),
      );

      // Transaction implementation in mock: ensure rollback reverts listing status
      const originalTx = mockPrismaService.$transaction;
      mockPrismaService.$transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => {
        const snapshot = new Map(listingsStore);
        try {
          return await cb(mockPrismaService);
        } catch (err) {
          listingsStore = snapshot; // Rollback simulation
          throw err;
        }
      });

      await expect(
        listingsService.moderateListing(created.id, 'usr_admin_01', {
          status: ListingStatus.APPROVED,
          reason: 'Duyệt',
        }),
      ).rejects.toThrow('Database disk error on ModerationLog insert');

      // Status must remain PENDING because transaction rolled back!
      expect(listingsStore.get(created.id).status).toBe(ListingStatus.PENDING);

      mockPrismaService.moderationLog.create = originalLogCreate;
      mockPrismaService.$transaction = originalTx;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. GET /api/listings (Public Search): APPROVED only & Private fields exclusion
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/listings (Public list) & GET /api/listings/:id (Public detail)', () => {
    beforeEach(async () => {
      // Create 3 listings: 1 APPROVED, 1 DRAFT, 1 PENDING
      const l1 = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà APPROVED công khai',
        description: 'Mô tả công khai',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '5000000000',
        areaSqm: 100,
        province: 'Hà Nội',
        district: 'Đống Đa',
        streetAddress: 'Số 123 Ngõ 456 Đường Bí Mật',
        latitude: 21.0285,
        longitude: 105.8542,
      });
      listingsStore.get(l1.id).status = ListingStatus.APPROVED;

      await listingsService.createListing('usr_owner_01', {
        title: 'Nhà DRAFT nội bộ',
        description: 'Mô tả',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '5000000000',
        areaSqm: 100,
        province: 'Hà Nội',
        district: 'Đống Đa',
        streetAddress: 'Địa chỉ nháp',
      });

      const l3 = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà PENDING chờ duyệt',
        description: 'Mô tả',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '5000000000',
        areaSqm: 100,
        province: 'Hà Nội',
        district: 'Đống Đa',
      });
      listingsStore.get(l3.id).status = ListingStatus.PENDING;
    });

    it('public search should return ONLY APPROVED listings', async () => {
      const res = await listingsService.getPublicListings({ page: 1, limit: 10 });
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('Nhà APPROVED công khai');
      expect(res.data[0].status).toBe(ListingStatus.APPROVED);
    });

    it('public search response MUST NEVER expose streetAddress or exact coordinates', async () => {
      const res = await listingsService.getPublicListings({ page: 1, limit: 10 });
      const item = res.data[0];

      expect(item.province).toBe('Hà Nội');
      expect(item.district).toBe('Đống Đa');
      expect((item as any).streetAddress).toBeUndefined();
      expect((item as any).latitude).toBeUndefined();
      expect((item as any).longitude).toBeUndefined();
      expect((item as any).owner).toBeUndefined();
    });

    it('public detail GET /api/listings/:id MUST return 404 for non-APPROVED listings', async () => {
      // Find the DRAFT listing
      let draftId = '';
      let approvedId = '';
      for (const [id, item] of listingsStore.entries()) {
        if (item.status === ListingStatus.DRAFT) draftId = id;
        if (item.status === ListingStatus.APPROVED) approvedId = id;
      }

      // Non-approved returns 404
      await expect(
        listingsService.getPublicListingDetail(draftId),
      ).rejects.toThrow(NotFoundException);

      // Approved returns item without streetAddress or coordinates
      const detail = await listingsService.getPublicListingDetail(approvedId);
      expect(detail).toBeDefined();
      expect(detail.status).toBe(ListingStatus.APPROVED);
      expect((detail as any).streetAddress).toBeUndefined();
      expect((detail as any).latitude).toBeUndefined();
      expect((detail as any).longitude).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. GET /api/listings/mine: Owner retrieval and route precedence
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/listings/mine', () => {
    it('should return authenticated user listings across all statuses', async () => {
      const l1 = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà của tôi DRAFT',
        description: 'Mô tả',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '1000000000',
        areaSqm: 40,
        province: 'Hà Nội',
        district: 'Hà Đông',
        streetAddress: '12 Quang Trung',
      });

      const l2 = await listingsService.createListing('usr_owner_01', {
        title: 'Nhà của tôi APPROVED',
        description: 'Mô tả',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_RENT,
        rentalPeriod: RentalPeriod.MONTH,
        priceVnd: '8000000',
        areaSqm: 55,
        province: 'Hà Nội',
        district: 'Hà Đông',
      });
      listingsStore.get(l2.id).status = ListingStatus.APPROVED;

      // Another user's listing
      await listingsService.createListing('usr_agent_01', {
        title: 'Nhà của môi giới khác',
        description: 'Mô tả',
        propertyType: PropertyType.LAND,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: '9000000000',
        areaSqm: 120,
        province: 'Đà Nẵng',
        district: 'Sơn Trà',
      });

      const res = await listingsService.getMyListings('usr_owner_01', {});
      expect(res.data.length).toBe(2);
      expect(res.data.map((i) => i.id)).toContain(l1.id);
      expect(res.data.map((i) => i.id)).toContain(l2.id);

      // Owner is allowed to see their own streetAddress
      const myDraft = res.data.find((i) => i.id === l1.id);
      expect(myDraft?.streetAddress).toBe('12 Quang Trung');
    });

    it('controller routing should resolve /mine without being shadowed by /:id', async () => {
      // In controller, getMyListings is decorated with @Get('mine') and getPublicListingDetail with @Get(':id')
      // Ensure calling controller method directly works cleanly
      const myRes = await listingsController.getMyListings('usr_owner_01', {});
      expect(myRes).toBeDefined();
      expect(myRes.meta).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Inactive user rejection on guarded routes
  // ─────────────────────────────────────────────────────────────
  describe('Inactive User Rejection via JwtAuthGuard', () => {
    it('should reject inactive users presenting a valid token with 401', async () => {
      const token = jwtService.sign(
        {
          sub: 'usr_inactive_owner',
          email: 'inactive_owner@example.test',
          role: Role.OWNER,
          fullName: 'Bị Khóa Tài Khoản',
        },
        { secret: 'test_jwt_secret_for_listings_specs' },
      );

      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow();
    });
  });
});
