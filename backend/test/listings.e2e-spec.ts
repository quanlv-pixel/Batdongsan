import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { initEnvironment } from '../src/config/env.config.js';

describe('Listings HTTP-level Integration Tests (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let ownerToken: string;
  let buyerToken: string;
  let adminToken: string;
  let baseline: Record<string, unknown>;

  // Track records created during this test run for guaranteed cleanup
  const createdListingIds: string[] = [];

  beforeAll(async () => {
    initEnvironment();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Isolation fingerprint of PRE-EXISTING data (verified unchanged in afterAll)
    baseline = await takeFingerprint();

    // Tokens for existing seed users; signed with the JwtModule-configured secret.
    // The guard re-loads each user from PostgreSQL, so payload role is not trusted.
    ownerToken = jwtService.sign({
      sub: 'seed_user_owner_01',
      email: 'owner@example.test',
      role: 'OWNER',
      fullName: 'Trần Thị Chủ Nhà',
    });

    buyerToken = jwtService.sign({
      sub: 'seed_user_buyer_01',
      email: 'buyer@example.test',
      role: 'BUYER',
      fullName: 'Lê Văn Người Mua',
    });

    adminToken = jwtService.sign({
      sub: 'seed_user_admin_01',
      email: 'admin@example.test',
      role: 'ADMIN',
      fullName: 'Quản trị viên Hệ thống',
    });
  });

  afterAll(async () => {
    // Isolated Cleanup: delete ONLY records created during this test run
    // (moderation logs first because of the FK without cascade).
    // NEVER reset, reseed, or truncate existing development/seed records.
    try {
      if (createdListingIds.length > 0) {
        await prisma.moderationLog.deleteMany({
          where: { listingId: { in: createdListingIds } },
        });
        await prisma.listing.deleteMany({
          where: { id: { in: createdListingIds } },
        });
      }
      const after = await takeFingerprint();
      console.log(
        `[isolation] run-created listings cleaned: ${createdListingIds.length}; ` +
          `baseline=${JSON.stringify(baseline)} after=${JSON.stringify(after)}`,
      );
      expect(after).toEqual(baseline);
    } finally {
      await app.close();
    }
  });

  async function takeFingerprint() {
    const [listings, logs, users, latestListing, latestUser] = await Promise.all([
      prisma.listing.count(),
      prisma.moderationLog.count(),
      prisma.user.count(),
      prisma.listing.aggregate({ _max: { updatedAt: true } }),
      prisma.user.aggregate({ _max: { updatedAt: true } }),
    ]);
    return {
      listings,
      logs,
      users,
      listingsMaxUpdatedAt: latestListing._max.updatedAt?.toISOString() ?? null,
      usersMaxUpdatedAt: latestUser._max.updatedAt?.toISOString() ?? null,
    };
  }

  async function createTestListing(title: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/listings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title,
        description: 'Bản ghi tạo trong kiểm thử e2e, sẽ bị xóa trong afterAll',
        propertyType: 'HOUSE',
        transactionType: 'FOR_SALE',
        priceVnd: '1500000000',
        areaSqm: 45,
        province: 'Đà Nẵng',
        district: 'Sơn Trà',
      })
      .expect(201);
    createdListingIds.push(res.body.id);
    return res.body.id as string;
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  describe('GET /api/listings (Public search on real DB)', () => {
    it('should return HTTP 200 with only APPROVED listings and safe fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/listings?page=1&limit=5')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);

      for (const item of res.body.data) {
        // Enforce BR-01: strictly APPROVED
        expect(item.status).toBe('APPROVED');

        // Enforce BR-03 & NFR-02: Private fields MUST NEVER be exposed
        expect(item.streetAddress).toBeUndefined();
        expect(item.latitude).toBeUndefined();
        expect(item.longitude).toBeUndefined();
        expect(item.owner).toBeUndefined();
        expect(item.moderationLogs).toBeUndefined();

        // Enforce BigInt serialization to string
        expect(typeof item.priceVnd).toBe('string');
      }
    });

    it('should support location and propertyType filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/listings?province=Hồ Chí Minh&propertyType=APARTMENT')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(item.status).toBe('APPROVED');
        expect(item.propertyType).toBe('APARTMENT');
      }
    });
  });

  describe('GET /api/listings/:id (Public detail on real DB)', () => {
    it('should return 200 for seed_listing_01 without private fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/listings/seed_listing_01')
        .expect(200);

      expect(res.body.id).toBe('seed_listing_01');
      expect(res.body.status).toBe('APPROVED');
      expect(typeof res.body.priceVnd).toBe('string');

      // Private fields must be excluded
      expect(res.body.streetAddress).toBeUndefined();
      expect(res.body.latitude).toBeUndefined();
      expect(res.body.longitude).toBeUndefined();
    });

    it('should return 404 for non-existent listing ID', async () => {
      await request(app.getHttpServer())
        .get('/api/listings/non_existent_cuid_9999999')
        .expect(404);
    });
  });

  describe('GET /api/listings/mine (Route resolution and Auth)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/listings/mine')
        .expect(401);
    });

    it('should resolve /mine route correctly and return owner listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/listings/mine')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/listings (Guards, Validation and Isolated Writes)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/listings')
        .send({ title: 'Test listing' })
        .expect(401);
    });

    it('should reject BUYER role with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/listings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Tin đăng của người mua',
          description: 'Người mua không được phép tạo tin',
          propertyType: 'APARTMENT',
          transactionType: 'FOR_SALE',
          priceVnd: '1000000000',
          areaSqm: 50,
          province: 'Hà Nội',
          district: 'Cầu Giấy',
        })
        .expect(403);
    });

    it('should reject forbidden client-supplied fields with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/listings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Tin đăng có trường cấm',
          description: 'Cố ý inject status và role',
          propertyType: 'APARTMENT',
          transactionType: 'FOR_SALE',
          priceVnd: '1000000000',
          areaSqm: 50,
          province: 'Hà Nội',
          district: 'Cầu Giấy',
          status: 'APPROVED', // FORBIDDEN FIELD
          role: 'ADMIN', // FORBIDDEN FIELD
        })
        .expect(400);
    });

    it('should allow OWNER to create DRAFT listing and clean it up cleanly in afterAll', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/listings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Căn hộ E2E kiểm tra cách ly dữ liệu',
          description: 'Bản ghi tạo trong kiểm thử tự động, sẽ xóa trong afterAll',
          propertyType: 'APARTMENT',
          transactionType: 'FOR_SALE',
          priceVnd: '2500000000',
          areaSqm: 68.5,
          province: 'Đà Nẵng',
          district: 'Hải Châu',
        })
        .expect(201);

      // Track created ID BEFORE assertions so cleanup happens even if an assertion fails
      createdListingIds.push(res.body.id);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.ownerId).toBe('seed_user_owner_01');
      expect(typeof res.body.priceVnd).toBe('string');
      expect(res.body.priceVnd).toBe('2500000000');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REAL CONCURRENCY CHECKS (PostgreSQL row locks, test-created records only)
  // A separate interactive transaction holds `SELECT ... FOR UPDATE` on the
  // test listing so that concurrent HTTP requests pass their read phase and
  // then block on the write; we release the lock and observe the outcome.
  // ─────────────────────────────────────────────────────────────
  describe('Real concurrency on PostgreSQL', () => {
    it('PATCH racing with a status change to PENDING must NOT modify the listing (409)', async () => {
      const id = await createTestListing('E2E race PATCH vs submit');
      const raceTitle = 'Tiêu đề KHÔNG được ghi sau khi PENDING';

      let patchPromise!: Promise<request.Response>;
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id} FOR UPDATE`;

          // PATCH reads DRAFT (plain SELECT is not blocked), then blocks on its UPDATE
          patchPromise = request(app.getHttpServer())
            .patch(`/api/listings/${id}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: raceTitle })
            .then((r) => r);
          await sleep(800);

          // Concurrent "submission" commits PENDING while PATCH is waiting
          await tx.listing.update({ where: { id }, data: { status: 'PENDING' } });
        },
        { timeout: 15000 },
      );

      const patchRes = await patchPromise;
      expect(patchRes.status).toBe(409);

      const row = await prisma.listing.findUnique({ where: { id } });
      expect(row!.status).toBe('PENDING');
      expect(row!.title).toBe('E2E race PATCH vs submit');
    });

    it('two competing moderation decisions: exactly one succeeds and exactly one ModerationLog exists', async () => {
      const id = await createTestListing('E2E race moderation');
      await request(app.getHttpServer())
        .post(`/api/listings/${id}/submit`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      let approve!: Promise<request.Response>;
      let reject!: Promise<request.Response>;
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id} FOR UPDATE`;
          approve = request(app.getHttpServer())
            .post(`/api/listings/${id}/moderate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'APPROVED', reason: 'Duyệt (race)' })
            .then((r) => r);
          reject = request(app.getHttpServer())
            .post(`/api/listings/${id}/moderate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'REJECTED', reason: 'Từ chối (race)' })
            .then((r) => r);
          await sleep(800); // both requests read PENDING and queue on the row lock
        },
        { timeout: 15000 },
      );

      const results = await Promise.all([approve, reject]);
      const statuses = results.map((r) => r.status).sort();
      const winners = results.filter((r) => r.status === 200);
      expect(winners.length).toBe(1);
      expect(statuses.filter((s) => s === 409 || s === 400).length).toBe(1);

      const logs = await prisma.moderationLog.findMany({ where: { listingId: id } });
      expect(logs.length).toBe(1);
      expect(logs[0].fromStatus).toBe('PENDING');

      const row = await prisma.listing.findUnique({ where: { id } });
      expect(row!.status).toBe(winners[0].body.status);
      expect(logs[0].toStatus).toBe(winners[0].body.status);
    });

    it('public detail of a non-APPROVED test listing returns 404 and list allowlist has no nested private data', async () => {
      const id = await createTestListing('E2E private detail check');
      await request(app.getHttpServer()).get(`/api/listings/${id}`).expect(404);

      const res = await request(app.getHttpServer()).get('/api/listings?limit=100').expect(200);
      const allowed = new Set([
        'id', 'title', 'description', 'propertyType', 'transactionType', 'priceVnd',
        'rentalPeriod', 'areaSqm', 'province', 'district', 'ward', 'status',
        'createdAt', 'updatedAt', 'images',
      ]);
      for (const item of res.body.data) {
        expect(item.id).not.toBe(id);
        for (const key of Object.keys(item)) expect(allowed.has(key)).toBe(true);
        for (const img of item.images) {
          expect(Object.keys(img).sort()).toEqual(['id', 'order', 'url']);
        }
      }
    });
  });
});
