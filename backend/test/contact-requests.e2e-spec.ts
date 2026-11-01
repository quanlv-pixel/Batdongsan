import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  ContactRequestStatus,
  ListingStatus,
  PropertyType,
  Role,
  TransactionType,
} from '../src/generated/prisma/enums.js';
import { initEnvironment } from '../src/config/env.config.js';

describe('Contact Requests & Agent Assignments HTTP Integration Tests (Real PostgreSQL 16)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let ownerToken: string;
  let agentAToken: string;
  let agentBToken: string;
  let agentOwnerToken: string;
  let buyerToken: string;
  let buyer2Token: string;
  let adminToken: string;

  let baseline: {
    listings: number;
    shares: number;
    contactRequests: number;
    requestAssignments: number;
    auditLogs: number;
    users: number;
  };

  // Track created records for guaranteed cleanup
  const createdListingIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdAssignmentIds: string[] = [];
  const createdUserIds: string[] = [];

  let testListingApprovedId: string;
  let testListingDraftId: string;
  let testListingAgentOwnedId: string;

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

    // Create an isolated secondary buyer for cross-user privacy tests
    const buyer2 = await prisma.user.create({
      data: {
        email: 'e2e_buyer_2@example.test',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        fullName: 'Người Mua Thứ Hai (E2E)',
        phone: '0909999992',
        role: Role.BUYER,
        isActive: true,
      },
    });
    createdUserIds.push(buyer2.id);
    buyer2Token = jwtService.sign({
      sub: buyer2.id,
      email: buyer2.email,
      role: Role.BUYER,
      fullName: buyer2.fullName,
    });

    // Create an isolated Agent who owns a listing (Priority 1 testing)
    const agentOwner = await prisma.user.create({
      data: {
        email: 'e2e_agent_owner@example.test',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        fullName: 'Môi Giới Chủ Nhà (E2E)',
        phone: '0909999993',
        role: Role.AGENT,
        isActive: true,
      },
    });
    createdUserIds.push(agentOwner.id);
    agentOwnerToken = jwtService.sign({
      sub: agentOwner.id,
      email: agentOwner.email,
      role: Role.AGENT,
      fullName: agentOwner.fullName,
    });

    // Create an isolated APPROVED test listing (owned by owner_01)
    const approvedListing = await prisma.listing.create({
      data: {
        title: 'E2E Approved Villa Thao Dien',
        description: 'Exclusive villa for contact request testing',
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
        title: 'E2E Draft Apartment',
        description: 'Draft apartment for contact request testing',
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

    // Create an isolated APPROVED test listing owned by an AGENT
    const agentOwnedListing = await prisma.listing.create({
      data: {
        title: 'E2E Agent Owned Penthouse',
        description: 'Agent owned penthouse in District 1',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.FOR_SALE,
        priceVnd: 25000000000n,
        areaSqm: 300,
        province: 'Ho Chi Minh',
        district: 'District 1',
        ward: 'Ben Nghe',
        streetAddress: '15 Le Duan',
        status: ListingStatus.APPROVED,
        ownerId: agentOwner.id,
      },
    });
    testListingAgentOwnedId = agentOwnedListing.id;
    createdListingIds.push(agentOwnedListing.id);
  });

  afterAll(async () => {
    try {
      // 0. Discover all assignment IDs for created requests so audit logs are fully cleaned
      if (createdRequestIds.length > 0) {
        const foundAssigns = await prisma.requestAssignment.findMany({
          where: { contactRequestId: { in: createdRequestIds } },
          select: { id: true },
        });
        for (const a of foundAssigns) {
          if (!createdAssignmentIds.includes(a.id)) {
            createdAssignmentIds.push(a.id);
          }
        }
      }

      // 1. Delete audit logs created during tests
      if (createdRequestIds.length > 0 || createdAssignmentIds.length > 0 || createdListingIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              { entityType: 'ContactRequest', entityId: { in: createdRequestIds } },
              { entityType: 'RequestAssignment', entityId: { in: createdAssignmentIds } },
              { actorId: { in: createdUserIds } },
              { meta: { path: ['listingId'], equals: testListingApprovedId } },
              { meta: { path: ['listingId'], equals: testListingDraftId } },
              { meta: { path: ['listingId'], equals: testListingAgentOwnedId } },
            ],
          },
        });
      }

      // 2. Delete request assignments created during tests
      if (createdRequestIds.length > 0 || createdAssignmentIds.length > 0) {
        await prisma.requestAssignment.deleteMany({
          where: {
            OR: [
              { contactRequestId: { in: createdRequestIds } },
              { id: { in: createdAssignmentIds } },
            ],
          },
        });
      }

      // 3. Delete contact requests created during tests
      if (createdRequestIds.length > 0 || createdListingIds.length > 0) {
        await prisma.contactRequest.deleteMany({
          where: {
            OR: [
              { id: { in: createdRequestIds } },
              { listingId: { in: createdListingIds } },
            ],
          },
        });
      }

      // 4. Delete listings created during tests
      if (createdListingIds.length > 0) {
        await prisma.listing.deleteMany({
          where: { id: { in: createdListingIds } },
        });
      }

      // 5. Delete users created during tests
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
    const [listings, shares, contactRequests, requestAssignments, auditLogs, users] =
      await Promise.all([
        prisma.listing.count(),
        prisma.mlsShare.count(),
        prisma.contactRequest.count(),
        prisma.requestAssignment.count(),
        prisma.auditLog.count(),
        prisma.user.count(),
      ]);
    return { listings, shares, contactRequests, requestAssignments, auditLogs, users };
  }

  describe('1. POST /api/contact-requests (Creation & Automatic Assignment)', () => {
    it('BUYER creates request on APPROVED listing with consent -> 201, IN_PROGRESS, auto-assigned', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          message: 'Tôi muốn đặt lịch xem nhà vào thứ Bảy',
          contactConsent: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.listingId).toBe(testListingApprovedId);
      expect(res.body.buyerId).toBe('seed_user_buyer_01');
      expect(res.body.contactConsent).toBe(true);
      expect(res.body.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(res.body.assignedAgentId).toBeDefined();

      createdRequestIds.push(res.body.id);

      // Verify assignment created in PostgreSQL
      const dbAssign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      expect(dbAssign).not.toBeNull();
      expect(dbAssign?.agentId).toBe(res.body.assignedAgentId);
      if (dbAssign) createdAssignmentIds.push(dbAssign.id);

      // Verify AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'request.create', entityId: res.body.id },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe('seed_user_buyer_01');
    });

    it('rejects creation when contactConsent is false or missing (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          message: 'No consent',
          contactConsent: false,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          message: 'Missing consent',
        })
        .expect(400);
    });

    it('rejects creation on DRAFT listing (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingDraftId,
          contactConsent: true,
        })
        .expect(400);
    });

    it('rejects self-request for a listing the caller owns (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          listingId: testListingApprovedId,
          contactConsent: true,
        })
        .expect(400);
    });

    it('rejects creation when message contains only whitespace (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          message: '   ',
          contactConsent: true,
        })
        .expect(400);
    });

    it('ADMIN cannot create a contact request (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          listingId: testListingApprovedId,
          contactConsent: true,
        })
        .expect(403);
    });

    it('Priority 1: automatically assigns to active AGENT who owns the listing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingAgentOwnedId,
          message: 'Quan tâm penthouse',
          contactConsent: true,
        })
        .expect(201);

      createdRequestIds.push(res.body.id);
      expect(res.body.assignedAgentId).toBe(createdUserIds[1]); // agentOwner.id

      const dbAssign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (dbAssign) createdAssignmentIds.push(dbAssign.id);
    });
  });

  describe('2. GET /api/contact-requests/my-requests (Buyer View)', () => {
    it('Buyer views their own submitted requests with safe listing summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contact-requests/my-requests?page=1&limit=10')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data[0];
      expect(item).toHaveProperty('listing');
      expect(typeof item.listing.priceVnd).toBe('string');
      expect(item).toHaveProperty('assignedAgent');
    });
  });

  describe('3. GET /api/contact-requests/assigned (Agent View & Privacy Allowlist)', () => {
    it('Active assigned Agent views their assigned requests with buyer contact info when consent is true', async () => {
      // Find an agent assigned in test 1
      const res = await request(app.getHttpServer())
        .get('/api/contact-requests/assigned?page=1&limit=10')
        .set('Authorization', `Bearer ${agentOwnerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data[0];
      expect(item.buyer).toBeDefined();
      expect(item.buyer.fullName).toBe('Lê Văn Người Mua');
      expect(item.buyer.email).toBe('buyer@example.test');
      expect(item.buyer.phone).toBe('0901000004');
    });

    it('Non-agent user receives 403 Forbidden on /assigned', async () => {
      await request(app.getHttpServer())
        .get('/api/contact-requests/assigned')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });

  describe('4. GET /api/contact-requests/for-owned-listings (Listing Owner View)', () => {
    it('Listing owner views metadata-only request overview without buyer identity or message', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contact-requests/for-owned-listings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('listingId');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('listing');

      // Strictly must NOT expose buyer info or message
      expect(item.buyer).toBeUndefined();
      expect(item.buyerId).toBeUndefined();
      expect(item.message).toBeUndefined();
      expect(item.assignedAgent).toBeUndefined();
    });
  });

  describe('5. GET /api/contact-requests/:id (Detail Privacy Allowlists)', () => {
    let testReqId: string;
    let assignedAgentId: string;

    beforeAll(async () => {
      // Create a fresh request
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          message: 'Khảo sát giá villa',
          contactConsent: true,
        })
        .expect(201);

      testReqId = res.body.id;
      assignedAgentId = res.body.assignedAgentId;
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);
    });

    it('Buyer reads own request with full contact details and assigned agent summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.id).toBe(testReqId);
      expect(res.body.buyer.email).toBe('buyer@example.test');
      expect(res.body.buyer.phone).toBe('0901000004');
      expect(res.body.assignedAgent).toBeDefined();
      expect(res.body.assignedAgent.email).toBeUndefined();
      expect(res.body.accessContext.isBuyer).toBe(true);
      expect(res.body.buyer.passwordHash).toBeUndefined();
    });

    it('Different buyer receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .expect(403);
    });

    it('Active assigned Agent receives details including buyer contact when consent is true', async () => {
      const targetToken = assignedAgentId === 'seed_user_agent_a' ? agentAToken : agentBToken;

      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${targetToken}`)
        .expect(200);

      expect(res.body.buyer.fullName).toBe('Lê Văn Người Mua');
      expect(res.body.buyer.email).toBe('buyer@example.test');
      expect(res.body.buyer.phone).toBe('0901000004');
      expect(res.body.accessContext.isAssignedAgent).toBe(true);
      expect(res.body.buyer.passwordHash).toBeUndefined();
    });

    it('Active assigned Agent does NOT receive email/phone when contactConsent is false', async () => {
      // Temporarily set contactConsent to false directly in DB (simulating legacy data)
      await prisma.contactRequest.update({
        where: { id: testReqId },
        data: { contactConsent: false },
      });

      const targetToken = assignedAgentId === 'seed_user_agent_a' ? agentAToken : agentBToken;

      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${targetToken}`)
        .expect(200);

      expect(res.body.buyer.fullName).toBe('Lê Văn Người Mua');
      expect(res.body.buyer.email).toBeUndefined();
      expect(res.body.buyer.phone).toBeUndefined();

      // Restore contactConsent = true
      await prisma.contactRequest.update({
        where: { id: testReqId },
        data: { contactConsent: true },
      });
    });

    it('Listing owner receives restricted allowlist (no buyer name/email/phone/message)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.id).toBe(testReqId);
      expect(res.body.listing.title).toBe('E2E Approved Villa Thao Dien');
      expect(res.body.accessContext.isListingOwner).toBe(true);

      // Must NOT expose buyer info or message
      expect(res.body.buyer).toBeUndefined();
      expect(res.body.buyerId).toBeUndefined();
      expect(res.body.message).toBeUndefined();
      expect(res.body.assignedAgent).toBeUndefined();
    });

    it('ADMIN reads full permitted details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${testReqId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(testReqId);
      expect(res.body.buyer.email).toBe('buyer@example.test');
      expect(res.body.accessContext.isAdmin).toBe(true);
      expect(res.body.buyer.passwordHash).toBeUndefined();
    });
  });

  describe('5B. GET /api/contact-requests (ADMIN Management & Filtering)', () => {
    it('ADMIN list rejects invalid unassigned query value (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .get('/api/contact-requests?unassigned=abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('ADMIN list rejects combination of agentId and unassigned=true (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .get('/api/contact-requests?agentId=seed_user_agent_a&unassigned=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('ADMIN list returns requests successfully with valid filters (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contact-requests?page=1&limit=10&unassigned=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('6. PATCH /api/contact-requests/:id/status (State Machine)', () => {
    let testReqId: string;
    let assignedToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          contactConsent: true,
        })
        .expect(201);

      testReqId = res.body.id;
      createdRequestIds.push(res.body.id);
      assignedToken = res.body.assignedAgentId === 'seed_user_agent_a' ? agentAToken : agentBToken;

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);
    });

    it('Active assigned Agent updates status IN_PROGRESS -> COMPLETED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/contact-requests/${testReqId}/status`)
        .set('Authorization', `Bearer ${assignedToken}`)
        .send({
          status: ContactRequestStatus.COMPLETED,
          note: 'Tư vấn hoàn tất',
        })
        .expect(200);

      expect(res.body.status).toBe(ContactRequestStatus.COMPLETED);

      // Verify AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'request.status_change', entityId: testReqId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.meta).toMatchObject({
        fromStatus: ContactRequestStatus.IN_PROGRESS,
        toStatus: ContactRequestStatus.COMPLETED,
      });
    });

    it('Agent cannot update terminal COMPLETED request (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${testReqId}/status`)
        .set('Authorization', `Bearer ${assignedToken}`)
        .send({
          status: ContactRequestStatus.IN_PROGRESS,
        })
        .expect(400);
    });

    it('Unassigned/different agent receives 403 Forbidden when attempting status update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${testReqId}/status`)
        .set('Authorization', `Bearer ${agentOwnerToken}`)
        .send({
          status: ContactRequestStatus.IN_PROGRESS,
        })
        .expect(403);
    });

    it('Active assigned Agent attempts IN_PROGRESS -> NEW: rejected (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListingApprovedId, contactConsent: true })
        .expect(201);
      createdRequestIds.push(res.body.id);
      const token = res.body.assignedAgentId === 'seed_user_agent_a' ? agentAToken : agentBToken;

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${res.body.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ContactRequestStatus.NEW })
        .expect(400);
    });

    it('ADMIN attempts IN_PROGRESS -> NEW through PATCH: rejected (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListingApprovedId, contactConsent: true })
        .expect(201);
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${res.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ContactRequestStatus.NEW })
        .expect(400);
    });

    it('ADMIN attempts NEW -> IN_PROGRESS through PATCH without assignment: rejected (400 Bad Request)', async () => {
      const req = await prisma.contactRequest.create({
        data: {
          listingId: testListingApprovedId,
          buyerId: 'seed_user_buyer_01',
          contactConsent: true,
          status: ContactRequestStatus.NEW,
        },
      });
      createdRequestIds.push(req.id);

      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${req.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ContactRequestStatus.IN_PROGRESS })
        .expect(400);
    });

    it('ADMIN can reject a NEW unassigned request (200 OK)', async () => {
      const req = await prisma.contactRequest.create({
        data: {
          listingId: testListingApprovedId,
          buyerId: 'seed_user_buyer_01',
          contactConsent: true,
          status: ContactRequestStatus.NEW,
        },
      });
      createdRequestIds.push(req.id);

      const res = await request(app.getHttpServer())
        .patch(`/api/contact-requests/${req.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ContactRequestStatus.REJECTED })
        .expect(200);

      expect(res.body.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('ADMIN can complete an IN_PROGRESS request (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListingApprovedId, contactConsent: true })
        .expect(201);
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/contact-requests/${res.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ContactRequestStatus.COMPLETED })
        .expect(200);

      expect(patchRes.body.status).toBe(ContactRequestStatus.COMPLETED);
    });

    it('ADMIN can reject an IN_PROGRESS request (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListingApprovedId, contactConsent: true })
        .expect(201);
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/contact-requests/${res.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ContactRequestStatus.REJECTED })
        .expect(200);

      expect(patchRes.body.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('Reject unchanged status with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListingApprovedId, contactConsent: true })
        .expect(201);
      createdRequestIds.push(res.body.id);
      const token = res.body.assignedAgentId === 'seed_user_agent_a' ? agentAToken : agentBToken;

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      await request(app.getHttpServer())
        .patch(`/api/contact-requests/${res.body.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ContactRequestStatus.IN_PROGRESS })
        .expect(400);
    });
  });

  describe('7. Reopen Workflow & Assignment History', () => {
    let completedReqId: string;

    beforeAll(async () => {
      // Create and complete a request
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          contactConsent: true,
        })
        .expect(201);

      completedReqId = res.body.id;
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      await prisma.contactRequest.update({
        where: { id: completedReqId },
        data: { status: ContactRequestStatus.COMPLETED },
      });
    });

    it('ADMIN reopens terminal request with non-empty reason -> 200, restores IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/contact-requests/${completedReqId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Khách hàng liên hệ lại yêu cầu xem thêm lần 2',
        })
        .expect(200);

      expect(res.body.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(res.body.reason).toBe('Khách hàng liên hệ lại yêu cầu xem thêm lần 2');

      // Verify AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'request.reopen', entityId: completedReqId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.meta).toMatchObject({
        previousStatus: ContactRequestStatus.COMPLETED,
        newStatus: ContactRequestStatus.IN_PROGRESS,
      });
    });

    it('Reopening with empty reason is rejected with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post(`/api/contact-requests/${completedReqId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: '   ',
        })
        .expect(400);
    });
  });

  describe('8. ADMIN Reassignment & Immediate Access Revocation', () => {
    let reassignReqId: string;
    let oldAgentToken: string;
    let newAgentToken: string;
    let newAgentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingApprovedId,
          contactConsent: true,
        })
        .expect(201);

      reassignReqId = res.body.id;
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);

      if (res.body.assignedAgentId === 'seed_user_agent_a') {
        oldAgentToken = agentAToken;
        newAgentToken = agentBToken;
        newAgentId = 'seed_user_agent_b';
      } else {
        oldAgentToken = agentBToken;
        newAgentToken = agentAToken;
        newAgentId = 'seed_user_agent_a';
      }
    });

    it('ADMIN reassigns to new Agent: releases old assignment and creates new active assignment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/contact-requests/${reassignReqId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          agentId: newAgentId,
          reason: 'Phân bổ lại khối lượng công việc',
        })
        .expect(200);

      expect(res.body.agentId).toBe(newAgentId);
      expect(res.body.isActive).toBe(true);

      const newDbAssign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: reassignReqId, agentId: newAgentId },
      });
      if (newDbAssign) createdAssignmentIds.push(newDbAssign.id);

      // Verify AuditLog written
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'request.reassign', entityId: res.body.id },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe('seed_user_admin_01');
    });

    it('Old Agent immediately receives 403 Forbidden when attempting to access request', async () => {
      await request(app.getHttpServer())
        .get(`/api/contact-requests/${reassignReqId}`)
        .set('Authorization', `Bearer ${oldAgentToken}`)
        .expect(403);
    });

    it('New Agent successfully accesses request with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contact-requests/${reassignReqId}`)
        .set('Authorization', `Bearer ${newAgentToken}`)
        .expect(200);

      expect(res.body.id).toBe(reassignReqId);
      expect(res.body.accessContext.isAssignedAgent).toBe(true);
    });

    it('ADMIN and active Agent can inspect assignment history in chronological order', async () => {
      const adminRes = await request(app.getHttpServer())
        .get(`/api/contact-requests/${reassignReqId}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminRes.body.assignments.length).toBe(2);
      expect(adminRes.body.assignments[0].isActive).toBe(false);
      expect(adminRes.body.assignments[0].releasedAt).not.toBeNull();
      expect(adminRes.body.assignments[1].isActive).toBe(true);
      expect(adminRes.body.assignments[1].agentId).toBe(newAgentId);

      // Old agent receives 403 Forbidden
      await request(app.getHttpServer())
        .get(`/api/contact-requests/${reassignReqId}/assignments`)
        .set('Authorization', `Bearer ${oldAgentToken}`)
        .expect(403);
    });

    it('Reassignment without a current active Agent returns 409 Conflict', async () => {
      const req = await prisma.contactRequest.create({
        data: {
          listingId: testListingApprovedId,
          buyerId: 'seed_user_buyer_01',
          contactConsent: true,
          status: ContactRequestStatus.NEW,
        },
      });
      createdRequestIds.push(req.id);

      await request(app.getHttpServer())
        .post(`/api/contact-requests/${req.id}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: 'seed_user_agent_a', reason: 'Attempt reassign without active' })
        .expect(409);
    });

    it('Reassigning a terminal request is rejected with 400 Bad Request', async () => {
      const req = await prisma.contactRequest.create({
        data: {
          listingId: testListingApprovedId,
          buyerId: 'seed_user_buyer_01',
          contactConsent: true,
          status: ContactRequestStatus.COMPLETED,
        },
      });
      createdRequestIds.push(req.id);

      await request(app.getHttpServer())
        .post(`/api/contact-requests/${req.id}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: 'seed_user_agent_a', reason: 'Attempt reassign on completed' })
        .expect(400);
    });
  });

  describe('9. Concurrency & Integrity: Parallel Reassignment Race', () => {
    let raceReqId: string;

    beforeAll(async () => {
      // Create request on agent-owned listing so initial assignment is the owner agent
      const res = await request(app.getHttpServer())
        .post('/api/contact-requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: testListingAgentOwnedId,
          contactConsent: true,
        })
        .expect(201);

      raceReqId = res.body.id;
      createdRequestIds.push(res.body.id);

      const assign = await prisma.requestAssignment.findFirst({
        where: { contactRequestId: res.body.id, isActive: true },
      });
      if (assign) createdAssignmentIds.push(assign.id);
    });

    it('two competing assignments against the same request never leave two active assignments in PostgreSQL', async () => {
      // Launch two competing reassignment requests concurrently to Agent A and Agent B (neither is the initial owner agent)
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/contact-requests/${raceReqId}/reassign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ agentId: 'seed_user_agent_a', reason: 'Race 1' }),
        request(app.getHttpServer())
          .post(`/api/contact-requests/${raceReqId}/reassign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ agentId: 'seed_user_agent_b', reason: 'Race 2' }),
      ]);

      // At least one request succeeded (200), and both responses are valid HTTP results (never 500)
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);

      const successCount = statuses.filter((s) => s === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(successCount).toBeLessThanOrEqual(2);

      // Exactly one active assignment must remain in PostgreSQL
      const activeAssignments = await prisma.requestAssignment.findMany({
        where: { contactRequestId: raceReqId, isActive: true },
      });
      expect(activeAssignments.length).toBe(1);

      // Total assignments count equals 1 (initial owner agent) + successCount
      const allRaceAssigns = await prisma.requestAssignment.findMany({
        where: { contactRequestId: raceReqId },
      });
      expect(allRaceAssigns.length).toBe(1 + successCount);

      // Verify released assignments history
      const releasedAssigns = allRaceAssigns.filter((a) => !a.isActive);
      expect(releasedAssigns.length).toBe(successCount);
      for (const rel of releasedAssigns) {
        expect(rel.releasedAt).not.toBeNull();
      }

      // Verify AuditLogs count matches exactly the number of committed reassignments
      const reassignAudits = await prisma.auditLog.findMany({
        where: {
          action: 'request.reassign',
          entityType: 'RequestAssignment',
          entityId: { in: allRaceAssigns.map((a) => a.id) },
        },
      });
      expect(reassignAudits.length).toBe(successCount);

      // Clean up newly created assignments from race
      for (const a of allRaceAssigns) {
        if (!createdAssignmentIds.includes(a.id)) {
          createdAssignmentIds.push(a.id);
        }
      }
    });

    it('concurrent first-assignment: two competing ADMIN assign requests to different agents never leave two active assignments', async () => {
      const req = await prisma.contactRequest.create({
        data: {
          listingId: testListingApprovedId,
          buyerId: 'seed_user_buyer_01',
          contactConsent: true,
          status: ContactRequestStatus.NEW,
        },
      });
      createdRequestIds.push(req.id);

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/contact-requests/${req.id}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ agentId: 'seed_user_agent_a', reason: 'Assign Race A' }),
        request(app.getHttpServer())
          .post(`/api/contact-requests/${req.id}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ agentId: 'seed_user_agent_b', reason: 'Assign Race B' }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);
      expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

      const activeAssigns = await prisma.requestAssignment.findMany({
        where: { contactRequestId: req.id, isActive: true },
      });
      expect(activeAssigns.length).toBe(1);

      const allAssigns = await prisma.requestAssignment.findMany({
        where: { contactRequestId: req.id },
      });
      for (const a of allAssigns) {
        if (!createdAssignmentIds.includes(a.id)) {
          createdAssignmentIds.push(a.id);
        }
      }

      const updatedReq = await prisma.contactRequest.findUnique({
        where: { id: req.id },
      });
      expect(updatedReq?.status).toBe(ContactRequestStatus.IN_PROGRESS);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'request.assign', entityId: activeAssigns[0].id },
      });
      expect(audit).not.toBeNull();
    });
  });
});
