import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { initEnvironment } from '../src/config/env.config.js';
import {
  ListingStatus,
  MlsSharePermission,
  PropertyType,
  Role,
  TransactionType,
} from '../src/generated/prisma/enums.js';

describe('MLS HTTP-level Integration Tests (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let ownerToken: string;
  let agentAToken: string;
  let agentBToken: string;
  let buyerToken: string;
  let adminToken: string;

  let baseline: {
    listings: number;
    shares: number;
    auditLogs: number;
    users: number;
  };

  // Track created records for guaranteed cleanup
  const createdListingIds: string[] = [];
  const createdShareIds: string[] = [];
  const createdAuditLogIds: string[] = [];
  const createdUserIds: string[] = [];

  let testListingApprovedId: string;
  let testListingDraftId: string;

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

    // Record baseline fingerprint of pre-existing data
    baseline = await takeFingerprint();

    // Generate tokens for existing seed users
    ownerToken = jwtService.sign({
      sub: 'seed_user_owner_01',
      email: 'owner@example.test',
      role: Role.OWNER,
      fullName: 'Trần Thị Chủ Nhà',
    });

    agentAToken = jwtService.sign({
      sub: 'seed_user_agent_a',
      email: 'agent_a@example.test',
      role: Role.AGENT,
      fullName: 'Nguyễn Văn Môi Giới (Đại lý A)',
    });

    agentBToken = jwtService.sign({
      sub: 'seed_user_agent_b',
      email: 'agent_b@example.test',
      role: Role.AGENT,
      fullName: 'Lê Thị Môi Giới (Đại lý B)',
    });

    buyerToken = jwtService.sign({
      sub: 'seed_user_buyer_01',
      email: 'buyer@example.test',
      role: Role.BUYER,
      fullName: 'Lê Văn Người Mua',
    });

    adminToken = jwtService.sign({
      sub: 'seed_user_admin_01',
      email: 'admin@example.test',
      role: Role.ADMIN,
      fullName: 'Quản trị viên Hệ thống',
    });

    // Create an isolated APPROVED test listing
    const approvedListing = await prisma.listing.create({
      data: {
        title: 'MLS Test Approved Villa Thao Dien',
        description: 'Exclusive villa for MLS testing',
        propertyType: PropertyType.VILLA,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: 45000000000n,
        areaSqm: 500,
        province: 'Ho Chi Minh',
        district: 'Thu Duc',
        ward: 'Thao Dien',
        streetAddress: '999 Nguyen Van Huong, Thao Dien',
        latitude: 10.8041,
        longitude: 106.7335,
        status: ListingStatus.APPROVED,
        ownerId: 'seed_user_owner_01',
      },
    });
    testListingApprovedId = approvedListing.id;
    createdListingIds.push(approvedListing.id);

    // Create an isolated DRAFT test listing
    const draftListing = await prisma.listing.create({
      data: {
        title: 'MLS Test Draft Apartment',
        description: 'Draft apartment for MLS testing',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_RENT,
        priceVnd: 20000000n,
        rentalPeriod: 'MONTH',
        areaSqm: 80,
        province: 'Ho Chi Minh',
        district: 'Binh Thanh',
        ward: 'Ward 22',
        streetAddress: '888 Dien Bien Phu',
        latitude: 10.795,
        longitude: 106.71,
        status: ListingStatus.DRAFT,
        ownerId: 'seed_user_owner_01',
      },
    });
    testListingDraftId = draftListing.id;
    createdListingIds.push(draftListing.id);
  });

  afterAll(async () => {
    try {
      // 1. Delete audit logs created during tests
      if (createdListingIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              { meta: { path: ['listingId'], equals: testListingApprovedId } },
              { meta: { path: ['listingId'], equals: testListingDraftId } },
            ],
          },
        });
      }
      if (createdShareIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { entityType: 'MlsShare', entityId: { in: createdShareIds } },
        });
      }

      // 2. Delete shares created during tests
      if (createdListingIds.length > 0) {
        await prisma.mlsShare.deleteMany({
          where: { listingId: { in: createdListingIds } },
        });
      }

      // 3. Delete listings created during tests
      if (createdListingIds.length > 0) {
        await prisma.listing.deleteMany({
          where: { id: { in: createdListingIds } },
        });
      }

      // 4. Delete users created during tests
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }

      const after = await takeFingerprint();
      console.log(
        `[isolation] baseline=${JSON.stringify(baseline)} after=${JSON.stringify(after)}`,
      );
      expect(after).toEqual(baseline);
    } finally {
      await app.close();
    }
  });

  async function takeFingerprint() {
    const [listings, shares, auditLogs, users] = await Promise.all([
      prisma.listing.count(),
      prisma.mlsShare.count(),
      prisma.auditLog.count(),
      prisma.user.count(),
    ]);
    return { listings, shares, auditLogs, users };
  }

  describe('1. POST /api/mls/shares (Granting Access)', () => {
    it('allows listing owner to grant MLS VIEW access to active AGENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_a',
          permission: MlsSharePermission.VIEW,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.listingId).toBe(testListingApprovedId);
      expect(res.body.grantedById).toBe('seed_user_owner_01');
      expect(res.body.receivedById).toBe('seed_user_agent_a');
      expect(res.body.permission).toBe(MlsSharePermission.VIEW);
      expect(res.body.isActive).toBe(true);

      createdShareIds.push(res.body.id);

      // Verify AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'mls.grant',
          entityType: 'MlsShare',
          entityId: res.body.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe('seed_user_owner_01');
      if (audit) createdAuditLogIds.push(audit.id);
    });

    it('rejects duplicate active grant with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_a',
          permission: MlsSharePermission.VIEW,
        })
        .expect(409);

      expect(res.body.message).toContain('active MLS share already exists');
    });

    it('safely handles concurrent duplicate grants (exactly one succeeds with 201, other gets 409)', async () => {
      // Create a second isolated approved listing for concurrent test
      const concListing = await prisma.listing.create({
        data: {
          title: 'Concurrent Test Villa',
          description: 'Testing concurrency',
          propertyType: PropertyType.VILLA,
          transactionType: TransactionType.FOR_SALE,
          priceVnd: 30000000000n,
          areaSqm: 400,
          province: 'Ho Chi Minh',
          district: 'Thu Duc',
          ward: 'Thao Dien',
          status: ListingStatus.APPROVED,
          ownerId: 'seed_user_owner_01',
        },
      });
      createdListingIds.push(concListing.id);

      // Run two concurrent grant requests
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/mls/shares')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            listingId: concListing.id,
            recipientId: 'seed_user_agent_b',
          }),
        request(app.getHttpServer())
          .post('/api/mls/shares')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            listingId: concListing.id,
            recipientId: 'seed_user_agent_b',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const successBody = res1.status === 201 ? res1.body : res2.body;
      createdShareIds.push(successBody.id);
    });

    it('rejects self-sharing with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_owner_01',
        })
        .expect(400);
    });

    it('rejects grant on non-APPROVED listing with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingDraftId,
          recipientId: 'seed_user_agent_a',
        })
        .expect(400);
    });

    it('rejects grant to non-AGENT recipient (e.g. BUYER) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_buyer_01',
        })
        .expect(400);
    });

    it('rejects grant by non-owner (recipients cannot re-share) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${agentAToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_b',
        })
        .expect(403);
    });

    it('rejects grant to inactive recipient with 400 Bad Request', async () => {
      // Create an inactive AGENT user
      const inactiveAgent = await prisma.user.create({
        data: {
          email: 'inactive_test_agent@example.test',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          fullName: 'Inactive Test Agent',
          role: Role.AGENT,
          isActive: false,
        },
      });
      createdUserIds.push(inactiveAgent.id);

      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: inactiveAgent.id,
        })
        .expect(400);
    });
  });

  describe('2. GET /api/mls/listings/:id (Authorized Internal Detail Access)', () => {
    it('authorized agent receiving VIEW: may view permitted info but strictly omits streetAddress, coordinates, and owner email/phone', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);

      expect(res.body.id).toBe(testListingApprovedId);
      expect(res.body.province).toBe('Ho Chi Minh');
      expect(res.body.district).toBe('Thu Duc');
      expect(res.body.ward).toBe('Thao Dien');

      // VIEW strictly omits address and coordinates
      expect(res.body.streetAddress).toBeUndefined();
      expect(res.body.latitude).toBeUndefined();
      expect(res.body.longitude).toBeUndefined();

      // Owner contact email and phone strictly omitted
      expect(res.body.owner.fullName).toBe('Trần Thị Chủ Nhà');
      expect(res.body.owner.email).toBeUndefined();
      expect(res.body.owner.phone).toBeUndefined();
      expect(res.body.owner.passwordHash).toBeUndefined();

      expect(res.body.accessContext.role).toBe(Role.AGENT);
      expect(res.body.accessContext.permission).toBe(MlsSharePermission.VIEW);
    });

    it('authorized agent receiving MANAGE: includes streetAddress and coordinates, but strictly omits owner email/phone', async () => {
      // Grant MANAGE permission on concListing to agent B
      // concListing was created in test 1 and agent B has active share on it
      // Let's grant MANAGE to agent B on testListingDraftId? No, draft cannot be shared.
      // We can create a dedicated approved listing with MANAGE share for this test:
      const manageListing = await prisma.listing.create({
        data: {
          title: 'MLS Manage Detail Test Villa',
          description: 'Testing MANAGE detail allowlist',
          propertyType: PropertyType.VILLA,
          transactionType: TransactionType.FOR_SALE,
          priceVnd: 50000000000n,
          areaSqm: 450,
          province: 'Ho Chi Minh',
          district: 'Thu Duc',
          ward: 'Thao Dien',
          streetAddress: '777 Song Hanh, Thao Dien',
          latitude: 10.801,
          longitude: 106.731,
          status: ListingStatus.APPROVED,
          ownerId: 'seed_user_owner_01',
        },
      });
      createdListingIds.push(manageListing.id);

      const grantRes = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: manageListing.id,
          recipientId: 'seed_user_agent_b',
          permission: MlsSharePermission.MANAGE,
        })
        .expect(201);
      createdShareIds.push(grantRes.body.id);

      const res = await request(app.getHttpServer())
        .get(`/api/mls/listings/${manageListing.id}`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(200);

      expect(res.body.id).toBe(manageListing.id);
      // MANAGE includes streetAddress and exact coordinates
      expect(res.body.streetAddress).toBe('777 Song Hanh, Thao Dien');
      expect(res.body.latitude).toBeCloseTo(10.801, 3);
      expect(res.body.longitude).toBeCloseTo(106.731, 3);

      // MANAGE strictly omits owner email and phone
      expect(res.body.owner.fullName).toBe('Trần Thị Chủ Nhà');
      expect(res.body.owner.email).toBeUndefined();
      expect(res.body.owner.phone).toBeUndefined();
      expect(res.body.owner.passwordHash).toBeUndefined();

      expect(res.body.accessContext.role).toBe(Role.AGENT);
      expect(res.body.accessContext.permission).toBe(MlsSharePermission.MANAGE);
    });

    it('listing owner and ADMIN can view internal detail directly with full authorized contacts and address', async () => {
      const ownerRes = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(ownerRes.body.accessContext.isOwner).toBe(true);
      expect(ownerRes.body.streetAddress).toBe('999 Nguyen Van Huong, Thao Dien');
      expect(ownerRes.body.latitude).toBeCloseTo(10.8041, 4);
      expect(ownerRes.body.longitude).toBeCloseTo(106.7335, 4);
      expect(ownerRes.body.owner.fullName).toBe('Trần Thị Chủ Nhà');
      expect(ownerRes.body.owner.email).toBe('owner@example.test');
      expect(ownerRes.body.owner.phone).toBe('0901000003');
      expect(ownerRes.body.owner.passwordHash).toBeUndefined();

      const adminRes = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(adminRes.body.accessContext.role).toBe(Role.ADMIN);
      expect(adminRes.body.streetAddress).toBe('999 Nguyen Van Huong, Thao Dien');
      expect(adminRes.body.owner.email).toBe('owner@example.test');
      expect(adminRes.body.owner.phone).toBe('0901000003');
      expect(adminRes.body.owner.passwordHash).toBeUndefined();
    });

    it('denies access to an agent without a share with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(403);
    });

    it('denies access to non-agent (BUYER) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('denies access to non-APPROVED listing with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingDraftId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(403);
    });
  });

  describe('3. GET /api/mls/shares/received (AGENT Received Shares)', () => {
    it('agent receives paginated active shares list with formatted listing, omitting restricted fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mls/shares/received?page=1&limit=10')
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const shareItem = res.body.data.find(
        (s: any) => s.listing.id === testListingApprovedId,
      );
      expect(shareItem).toBeDefined();
      expect(typeof shareItem.listing.priceVnd).toBe('string');
      expect(shareItem.permission).toBe(MlsSharePermission.VIEW);

      // VIEW share omits streetAddress, exact coordinates, and owner email/phone
      expect(shareItem.listing.streetAddress).toBeUndefined();
      expect(shareItem.listing.latitude).toBeUndefined();
      expect(shareItem.listing.longitude).toBeUndefined();
      expect(shareItem.listing.owner.fullName).toBe('Trần Thị Chủ Nhà');
      expect(shareItem.listing.owner.email).toBeUndefined();
      expect(shareItem.listing.owner.phone).toBeUndefined();
    });

    it('non-AGENT user receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/mls/shares/received')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('4. GET /api/mls/listings/:listingId/shares (Share History)', () => {
    it('listing owner can view share history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}/shares`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].grantedBy.id).toBe('seed_user_owner_01');
      expect(res.body.data[0].receivedBy.id).toBe('seed_user_agent_a');
    });

    it('ADMIN can view share history for oversight', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}/shares`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('unauthorized user receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}/shares`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(403);
    });
  });

  describe('5. Revocation and Re-grant Lifecycle', () => {
    let activeShareId: string;

    beforeAll(async () => {
      // Find the active share for agent_a on testListingApprovedId
      const share = await prisma.mlsShare.findFirst({
        where: {
          listingId: testListingApprovedId,
          receivedById: 'seed_user_agent_a',
          isActive: true,
        },
      });
      activeShareId = share!.id;
    });

    it('rejects revocation by unauthorized user with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/mls/shares/${activeShareId}/revoke`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(403);
    });

    it('listing owner can revoke active share with audit log', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mls/shares/${activeShareId}/revoke`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Contract termination' })
        .expect(200);

      expect(res.body.isActive).toBe(false);
      expect(res.body.revokedAt).toBeDefined();

      // Check DB row: preserved with isActive = false
      const dbShare = await prisma.mlsShare.findUnique({
        where: { id: activeShareId },
      });
      expect(dbShare?.isActive).toBe(false);
      expect(dbShare?.revokedAt).not.toBeNull();

      // Check AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'mls.revoke',
          entityType: 'MlsShare',
          entityId: activeShareId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe('seed_user_owner_01');
      if (audit) createdAuditLogIds.push(audit.id);
    });

    it('subsequent access by revoked agent is immediately denied with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(403);
    });

    it('re-granting same listing to same agent succeeds (new row created, preserving history)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_a',
          permission: MlsSharePermission.MANAGE,
        })
        .expect(201);

      expect(res.body.id).not.toBe(activeShareId);
      expect(res.body.isActive).toBe(true);
      expect(res.body.permission).toBe(MlsSharePermission.MANAGE);

      createdShareIds.push(res.body.id);

      // Verify that agent A now has access again
      const detailRes = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);

      expect(detailRes.body.accessContext.permission).toBe(MlsSharePermission.MANAGE);
    });

    it('ADMIN can revoke share using DELETE /api/mls/shares/:id for oversight', async () => {
      // Find the latest active share
      const latestShare = await prisma.mlsShare.findFirst({
        where: {
          listingId: testListingApprovedId,
          receivedById: 'seed_user_agent_a',
          isActive: true,
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/mls/shares/${latestShare!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Audit log check
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'mls.revoke',
          entityType: 'MlsShare',
          entityId: latestShare!.id,
          actorId: 'seed_user_admin_01',
        },
      });
      expect(audit).not.toBeNull();
      if (audit) createdAuditLogIds.push(audit.id);
    });
  });

  describe('6. Listing Ownership by AGENT (Role-independent ownership)', () => {
    let agentOwnedListingId: string;
    let agentShareId: string;

    beforeAll(async () => {
      const listing = await prisma.listing.create({
        data: {
          title: 'Agent Owned Penthouse',
          description: 'Penthouse owned and listed by Agent A',
          propertyType: PropertyType.APARTMENT,
          transactionType: TransactionType.FOR_SALE,
          priceVnd: 15000000000n,
          areaSqm: 220,
          province: 'Ho Chi Minh',
          district: 'District 1',
          ward: 'Ben Nghe',
          streetAddress: '15 Le Duan',
          latitude: 10.781,
          longitude: 106.701,
          status: ListingStatus.APPROVED,
          ownerId: 'seed_user_agent_a',
        },
      });
      agentOwnedListingId = listing.id;
      createdListingIds.push(listing.id);
    });

    it('active AGENT who owns the listing can grant MLS share to another AGENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${agentAToken}`)
        .send({
          listingId: agentOwnedListingId,
          recipientId: 'seed_user_agent_b',
          permission: MlsSharePermission.VIEW,
        })
        .expect(201);

      expect(res.body.listingId).toBe(agentOwnedListingId);
      expect(res.body.grantedById).toBe('seed_user_agent_a');
      expect(res.body.receivedById).toBe('seed_user_agent_b');
      expect(res.body.isActive).toBe(true);

      agentShareId = res.body.id;
      createdShareIds.push(res.body.id);
    });

    it('recipient AGENT cannot re-share listing owned by another AGENT (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${agentBToken}`)
        .send({
          listingId: agentOwnedListingId,
          recipientId: 'seed_user_owner_01',
        })
        .expect(403);
    });

    it('recipient AGENT cannot revoke share (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/mls/shares/${agentShareId}/revoke`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(403);
    });

    it('recipient AGENT cannot view share history (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/mls/listings/${agentOwnedListingId}/shares`)
        .set('Authorization', `Bearer ${agentBToken}`)
        .expect(403);
    });

    it('owner AGENT can view share history (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mls/listings/${agentOwnedListingId}/shares`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('owner AGENT can revoke share (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mls/shares/${agentShareId}/revoke`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);
      expect(res.body.revokedAt).toBeDefined();
    });

    it('AGENT owning listing X and receiving share on listing Y can access both with correct allowlists', async () => {
      // Re-grant a VIEW share on testListingApprovedId to Agent A
      const grantRes = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_a',
          permission: MlsSharePermission.VIEW,
        })
        .expect(201);
      createdShareIds.push(grantRes.body.id);

      // 1. Agent A accesses their own listing as owner: full details + contact info
      const ownedRes = await request(app.getHttpServer())
        .get(`/api/mls/listings/${agentOwnedListingId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);
      expect(ownedRes.body.accessContext.isOwner).toBe(true);
      expect(ownedRes.body.streetAddress).toBe('15 Le Duan');
      expect(ownedRes.body.owner.email).toBe('agent_a@example.test');
      expect(ownedRes.body.owner.phone).toBe('0901000002');

      // 2. Agent A accesses testListingApprovedId where they are recipient of VIEW share:
      const sharedRes = await request(app.getHttpServer())
        .get(`/api/mls/listings/${testListingApprovedId}`)
        .set('Authorization', `Bearer ${agentAToken}`)
        .expect(200);
      expect(sharedRes.body.accessContext.isOwner).toBe(false);
      expect(sharedRes.body.accessContext.permission).toBe(MlsSharePermission.VIEW);
      expect(sharedRes.body.streetAddress).toBeUndefined();
      expect(sharedRes.body.latitude).toBeUndefined();
      expect(sharedRes.body.owner.email).toBeUndefined();
      expect(sharedRes.body.owner.phone).toBeUndefined();
    });
  });

  describe('7. Regrant on Expired-but-isActive Share (Unique Index & Regrant lifecycle)', () => {
    let expiredShareId: string;

    beforeAll(async () => {
      // Create an expired share directly in DB with isActive = true
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const expiredShare = await prisma.mlsShare.create({
        data: {
          listingId: testListingApprovedId,
          grantedById: 'seed_user_owner_01',
          receivedById: 'seed_user_agent_b',
          permission: MlsSharePermission.VIEW,
          expiresAt: pastDate,
          isActive: true, // Expired timestamp but isActive flag was not cleared
        },
      });
      expiredShareId = expiredShare.id;
      createdShareIds.push(expiredShare.id);
    });

    it('re-granting on an expired active share automatically retires old share and creates new active grant', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mls/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          recipientId: 'seed_user_agent_b',
          permission: MlsSharePermission.MANAGE,
        })
        .expect(201);

      expect(res.body.id).not.toBe(expiredShareId);
      expect(res.body.isActive).toBe(true);
      expect(res.body.permission).toBe(MlsSharePermission.MANAGE);

      createdShareIds.push(res.body.id);

      // Verify the old expired share in PostgreSQL has been retired cleanly
      const retiredShare = await prisma.mlsShare.findUnique({
        where: { id: expiredShareId },
      });
      expect(retiredShare?.isActive).toBe(false);
      expect(retiredShare?.revokedAt).not.toBeNull();

      // Verify audit log for mls.expire was written
      const expireAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'mls.expire',
          entityType: 'MlsShare',
          entityId: expiredShareId,
        },
      });
      expect(expireAudit).not.toBeNull();
      if (expireAudit) createdAuditLogIds.push(expireAudit.id);

      // Clean up the new active share for agent_b
      await prisma.mlsShare.delete({ where: { id: res.body.id } });
    });
  });
});
