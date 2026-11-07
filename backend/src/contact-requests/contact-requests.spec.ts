import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ContactRequestsService } from './contact-requests.service.js';
import { CreateContactRequestDto } from './dto/create-contact-request.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ContactRequestStatus,
  ListingStatus,
  PropertyType,
  Role,
  TransactionType,
} from '../generated/prisma/enums.js';

describe('ContactRequestsService Unit Tests (Phase 2D-2)', () => {
  let service: ContactRequestsService;

  // In-memory test stores
  let usersStore: Map<string, any>;
  let listingsStore: Map<string, any>;
  let requestsStore: Map<string, any>;
  let assignmentsStore: Map<string, any>;
  let auditLogsStore: any[];

  const mockPrismaService: any = {
    user: {
      findUnique: vi.fn(async ({ where, select }: any) => {
        const user = usersStore.get(where.id);
        if (!user) return null;
        if (select) {
          const res: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) res[k] = user[k];
          }
          return res;
        }
        return user;
      }),
      findMany: vi.fn(async ({ where, select, orderBy }: any) => {
        let results = Array.from(usersStore.values()).filter((u) => {
          if (where?.role && u.role !== where.role) return false;
          if (where?.isActive !== undefined && u.isActive !== where.isActive) return false;
          return true;
        });
        if (orderBy) {
          results.sort((a, b) => {
            for (const order of Array.isArray(orderBy) ? orderBy : [orderBy]) {
              const [key, dir] = Object.entries(order)[0] as [string, string];
              if (key === 'createdAt') {
                const diff = (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0);
                if (diff !== 0) return dir === 'asc' ? diff : -diff;
              }
              if (key === 'id') {
                const diff = a.id.localeCompare(b.id);
                if (diff !== 0) return dir === 'asc' ? diff : -diff;
              }
            }
            return 0;
          });
        }
        if (select) {
          return results.map((u) => {
            const res: any = {};
            for (const [k, v] of Object.entries(select)) {
              if (v) res[k] = u[k];
            }
            return res;
          });
        }
        return results;
      }),
    },
    listing: {
      findUnique: vi.fn(async ({ where, select, include }: any) => {
        const listing = listingsStore.get(where.id);
        if (!listing) return null;
        const owner = usersStore.get(listing.ownerId);

        let resListing = { ...listing };
        if (include?.owner) {
          resListing.owner = owner
            ? {
                id: owner.id,
                role: owner.role,
                isActive: owner.isActive,
                fullName: owner.fullName,
              }
            : null;
        }
        if (select) {
          const res: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) res[k] = resListing[k];
          }
          return res;
        }
        return resListing;
      }),
    },
    contactRequest: {
      create: vi.fn(async ({ data }: any) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        requestsStore.set(id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where, include }: any) => {
        const req = requestsStore.get(where.id);
        if (!req) return null;
        const result: any = { ...req };
        if (include?.buyer) {
          const buyer = usersStore.get(req.buyerId);
          result.buyer = buyer ? { ...buyer } : null;
        }
        if (include?.listing) {
          const listing = listingsStore.get(req.listingId);
          const owner = listing ? usersStore.get(listing.ownerId) : null;
          result.listing = listing
            ? {
                ...listing,
                owner: owner ? { id: owner.id, fullName: owner.fullName, role: owner.role, isActive: owner.isActive } : null,
              }
            : null;
        }
        if (include?.assignments) {
          let assigns = Array.from(assignmentsStore.values()).filter(
            (a) => a.contactRequestId === req.id,
          );
          if (include.assignments.where?.isActive !== undefined) {
            assigns = assigns.filter((a) => a.isActive === include.assignments.where.isActive);
          }
          if (include.assignments.orderBy?.assignedAt === 'desc') {
            assigns.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
          } else if (include.assignments.orderBy?.assignedAt === 'asc') {
            assigns.sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime());
          }
          result.assignments = assigns.map((a) => {
            const agent = usersStore.get(a.agentId);
            return {
              ...a,
              agent: agent ? { ...agent } : null,
            };
          });
        }
        return result;
      }),
      findMany: vi.fn(async ({ where, skip, take, include }: any) => {
        let results = Array.from(requestsStore.values()).filter((r) => {
          if (where?.buyerId && r.buyerId !== where.buyerId) return false;
          if (where?.status && r.status !== where.status) return false;
          if (where?.listingId && r.listingId !== where.listingId) return false;
          if (where?.listing?.ownerId) {
            const lst = listingsStore.get(r.listingId);
            if (lst?.ownerId !== where.listing.ownerId) return false;
          }
          if (where?.assignments?.some) {
            const hasMatch = Array.from(assignmentsStore.values()).some(
              (a) =>
                a.contactRequestId === r.id &&
                (!where.assignments.some.agentId || a.agentId === where.assignments.some.agentId) &&
                (where.assignments.some.isActive === undefined || a.isActive === where.assignments.some.isActive),
            );
            if (!hasMatch) return false;
          }
          if (where?.assignments?.none) {
            const hasActive = Array.from(assignmentsStore.values()).some(
              (a) => a.contactRequestId === r.id && a.isActive === true,
            );
            if (hasActive) return false;
          }
          return true;
        });

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const paginated = results.slice(skip ?? 0, (skip ?? 0) + (take ?? 20));

        return paginated.map((req) => {
          const res: any = { ...req };
          if (include?.buyer) {
            const buyer = usersStore.get(req.buyerId);
            res.buyer = buyer ? { ...buyer } : null;
          }
          if (include?.listing) {
            const lst = listingsStore.get(req.listingId);
            res.listing = lst ? { ...lst } : null;
          }
          if (include?.assignments) {
            let assigns = Array.from(assignmentsStore.values()).filter(
              (a) => a.contactRequestId === req.id,
            );
            if (include.assignments.where?.isActive !== undefined) {
              assigns = assigns.filter((a) => a.isActive === include.assignments.where.isActive);
            }
            res.assignments = assigns.map((a) => ({
              ...a,
              agent: usersStore.get(a.agentId),
            }));
          }
          return res;
        });
      }),
      count: vi.fn(async ({ where }: any) => {
        return Array.from(requestsStore.values()).filter((r) => {
          if (where?.buyerId && r.buyerId !== where.buyerId) return false;
          if (where?.status && r.status !== where.status) return false;
          if (where?.listingId && r.listingId !== where.listingId) return false;
          if (where?.listing?.ownerId) {
            const lst = listingsStore.get(r.listingId);
            if (lst?.ownerId !== where.listing.ownerId) return false;
          }
          if (where?.assignments?.some) {
            const hasMatch = Array.from(assignmentsStore.values()).some(
              (a) =>
                a.contactRequestId === r.id &&
                (!where.assignments.some.agentId || a.agentId === where.assignments.some.agentId) &&
                (where.assignments.some.isActive === undefined || a.isActive === where.assignments.some.isActive),
            );
            if (!hasMatch) return false;
          }
          if (where?.assignments?.none) {
            const hasActive = Array.from(assignmentsStore.values()).some(
              (a) => a.contactRequestId === r.id && a.isActive === true,
            );
            if (hasActive) return false;
          }
          return true;
        }).length;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const req = requestsStore.get(where.id);
        if (!req) throw new Error('Not found');
        const updated = { ...req, ...data, updatedAt: new Date() };
        requestsStore.set(where.id, updated);
        return updated;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [id, req] of requestsStore.entries()) {
          if (where.id && id !== where.id) continue;
          if (where.status && req.status !== where.status) continue;
          requestsStore.set(id, { ...req, ...data, updatedAt: new Date() });
          count++;
        }
        return { count };
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        const req = requestsStore.get(where.id);
        if (!req) throw new Error('Not found');
        return req;
      }),
    },
    requestAssignment: {
      create: vi.fn(async ({ data }: any) => {
        // Enforce Partial Unique Index simulation: WHERE isActive = true
        if (data.isActive) {
          const existingActive = Array.from(assignmentsStore.values()).find(
            (a) => a.contactRequestId === data.contactRequestId && a.isActive === true,
          );
          if (existingActive) {
            const p2002Error: any = new Error('Unique constraint failed on partial index');
            p2002Error.code = 'P2002';
            p2002Error.meta = { target: ['request_assignments_contactRequestId_key'] };
            throw p2002Error;
          }
        }
        const id = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = {
          id,
          ...data,
          assignedAt: data.assignedAt ?? new Date(),
          releasedAt: data.releasedAt ?? null,
        };
        assignmentsStore.set(id, record);
        return record;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const a of assignmentsStore.values()) {
          let match = true;
          if (where?.contactRequestId && a.contactRequestId !== where.contactRequestId) match = false;
          if (where?.agentId && a.agentId !== where.agentId) match = false;
          if (where?.isActive !== undefined && a.isActive !== where.isActive) match = false;
          if (match) return a;
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const assign = assignmentsStore.get(where.id);
        if (!assign) throw new Error('Not found');
        const updated = { ...assign, ...data };
        assignmentsStore.set(where.id, updated);
        return updated;
      }),
      groupBy: vi.fn(async ({ where }: any) => {
        const counts = new Map<string, number>();
        for (const a of assignmentsStore.values()) {
          if (where?.isActive !== undefined && a.isActive !== where.isActive) continue;
          if (where?.agentId?.in && !where.agentId.in.includes(a.agentId)) continue;
          counts.set(a.agentId, (counts.get(a.agentId) ?? 0) + 1);
        }
        return Array.from(counts.entries()).map(([agentId, count]) => ({
          agentId,
          _count: { id: count },
        }));
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = { id, ...data, createdAt: new Date() };
        auditLogsStore.push(record);
        return record;
      }),
    },
    $transaction: vi.fn(async (cb: any) => {
      return cb(mockPrismaService);
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    usersStore = new Map();
    listingsStore = new Map();
    requestsStore = new Map();
    assignmentsStore = new Map();
    auditLogsStore = [];

    // 1. Seed Users
    usersStore.set('usr_admin', {
      id: 'usr_admin',
      email: 'admin@example.test',
      fullName: 'Admin User',
      phone: '0901000001',
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date('2026-01-01'),
    });

    usersStore.set('usr_buyer_1', {
      id: 'usr_buyer_1',
      email: 'buyer1@example.test',
      fullName: 'Buyer User One',
      phone: '0901000002',
      role: Role.BUYER,
      isActive: true,
      createdAt: new Date('2026-01-02'),
    });

    usersStore.set('usr_buyer_2', {
      id: 'usr_buyer_2',
      email: 'buyer2@example.test',
      fullName: 'Buyer User Two',
      phone: '0901000003',
      role: Role.BUYER,
      isActive: true,
      createdAt: new Date('2026-01-03'),
    });

    usersStore.set('usr_owner_1', {
      id: 'usr_owner_1',
      email: 'owner1@example.test',
      fullName: 'Owner User',
      phone: '0901000004',
      role: Role.OWNER,
      isActive: true,
      createdAt: new Date('2026-01-04'),
    });

    usersStore.set('usr_agent_owner', {
      id: 'usr_agent_owner',
      email: 'agentowner@example.test',
      fullName: 'Agent Who Owns Listing',
      phone: '0901000005',
      role: Role.AGENT,
      isActive: true,
      createdAt: new Date('2026-01-05'),
    });

    usersStore.set('usr_agent_a', {
      id: 'usr_agent_a',
      email: 'agenta@example.test',
      fullName: 'Agent Alpha',
      phone: '0901000006',
      role: Role.AGENT,
      isActive: true,
      createdAt: new Date('2026-01-06'),
    });

    usersStore.set('usr_agent_b', {
      id: 'usr_agent_b',
      email: 'agentb@example.test',
      fullName: 'Agent Beta',
      phone: '0901000007',
      role: Role.AGENT,
      isActive: true,
      createdAt: new Date('2026-01-07'),
    });

    usersStore.set('usr_agent_inactive', {
      id: 'usr_agent_inactive',
      email: 'agentinactive@example.test',
      fullName: 'Inactive Agent',
      phone: '0901000008',
      role: Role.AGENT,
      isActive: false,
      createdAt: new Date('2026-01-08'),
    });

    // 2. Seed Listings
    listingsStore.set('lst_approved_owner1', {
      id: 'lst_approved_owner1',
      title: 'Approved Villa by Owner 1',
      description: 'Luxury villa in Thao Dien',
      propertyType: PropertyType.VILLA,
      transactionType: TransactionType.FOR_SALE,
      priceVnd: 50000000000n,
      areaSqm: 500,
      province: 'Ho Chi Minh',
      district: 'Thu Duc',
      ward: 'Thao Dien',
      status: ListingStatus.APPROVED,
      ownerId: 'usr_owner_1',
    });

    listingsStore.set('lst_approved_agent_owned', {
      id: 'lst_approved_agent_owned',
      title: 'Approved Penthouse owned by Agent',
      description: 'Penthouse in District 1',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_SALE,
      priceVnd: 20000000000n,
      areaSqm: 250,
      province: 'Ho Chi Minh',
      district: 'District 1',
      ward: 'Ben Nghe',
      status: ListingStatus.APPROVED,
      ownerId: 'usr_agent_owner',
    });

    listingsStore.set('lst_draft', {
      id: 'lst_draft',
      title: 'Draft Property',
      description: 'Unpublished draft',
      propertyType: PropertyType.HOUSE,
      transactionType: TransactionType.FOR_SALE,
      priceVnd: 5000000000n,
      areaSqm: 100,
      province: 'Ho Chi Minh',
      district: 'Binh Thanh',
      status: ListingStatus.DRAFT,
      ownerId: 'usr_owner_1',
    });

    service = new ContactRequestsService(mockPrismaService as PrismaService);
  });

  describe('1. Creation & Eligibility', () => {
    it('BUYER creates request successfully and gets assigned to lowest-workload active AGENT', async () => {
      const res = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', message: 'I want to schedule a visit', contactConsent: true },
      );

      expect(res).toBeDefined();
      expect(res.listingId).toBe('lst_approved_owner1');
      expect(res.buyerId).toBe('usr_buyer_1');
      expect(res.contactConsent).toBe(true);
      expect(res.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(res.assignedAgentId).toBeDefined();

      const dbReq = requestsStore.get(res.id);
      expect(dbReq).toBeDefined();

      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === res.id);
      expect(assign).toBeDefined();
      expect(assign.isActive).toBe(true);

      const audit = auditLogsStore.find((a) => a.action === 'request.create');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe('usr_buyer_1');
    });

    it('OWNER creates request for another person listing successfully', async () => {
      const res = await service.createRequest(
        { id: 'usr_owner_1', role: Role.OWNER },
        { listingId: 'lst_approved_agent_owned', contactConsent: true },
      );

      expect(res.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(res.buyerId).toBe('usr_owner_1');
    });

    it('AGENT creates request for another person listing successfully', async () => {
      const res = await service.createRequest(
        { id: 'usr_agent_a', role: Role.AGENT },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );

      expect(res.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(res.buyerId).toBe('usr_agent_a');
    });

    it('ADMIN is rejected when attempting to create a contact request (403)', async () => {
      await expect(
        service.createRequest(
          { id: 'usr_admin', role: Role.ADMIN },
          { listingId: 'lst_approved_owner1', contactConsent: true },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects self-request for a listing the caller owns (400)', async () => {
      await expect(
        service.createRequest(
          { id: 'usr_owner_1', role: Role.OWNER },
          { listingId: 'lst_approved_owner1', contactConsent: true },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects request for non-approved listing (400)', async () => {
      await expect(
        service.createRequest(
          { id: 'usr_buyer_1', role: Role.BUYER },
          { listingId: 'lst_draft', contactConsent: true },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects request for nonexistent listing (404)', async () => {
      await expect(
        service.createRequest(
          { id: 'usr_buyer_1', role: Role.BUYER },
          { listingId: 'lst_nonexistent', contactConsent: true },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('CreateContactRequestDto rejects whitespace-only message with validation error (400)', async () => {
      const dto = plainToInstance(CreateContactRequestDto, {
        listingId: 'lst_approved_owner1',
        contactConsent: true,
        message: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });

    it('CreateContactRequestDto accepts omitted message', async () => {
      const dto = plainToInstance(CreateContactRequestDto, {
        listingId: 'lst_approved_owner1',
        contactConsent: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('2. Deterministic Automatic Assignment Policy', () => {
    it('Priority 1: assigns to active AGENT who owns the listing', async () => {
      const res = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_agent_owned', contactConsent: true },
      );

      expect(res.assignedAgentId).toBe('usr_agent_owner');
    });

    it('Priority 2: chooses active AGENT with lowest active workload', async () => {
      // Set 1 active assignment for agent_a and agent_owner
      assignmentsStore.set('asg_dummy_1', {
        id: 'asg_dummy_1',
        contactRequestId: 'req_dummy_1',
        agentId: 'usr_agent_a',
        isActive: true,
        assignedAt: new Date(),
      });
      assignmentsStore.set('asg_dummy_2', {
        id: 'asg_dummy_2',
        contactRequestId: 'req_dummy_2',
        agentId: 'usr_agent_owner',
        isActive: true,
        assignedAt: new Date(),
      });

      // agent_b has 0 active assignments -> must be selected
      const res = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );

      expect(res.assignedAgentId).toBe('usr_agent_b');
    });

    it('Priority 2: tie-breaks deterministically by createdAt asc, id asc', async () => {
      // 1. With all having 0 workload, agent_owner (created 2026-01-05) is earlier than agent_a (Jan 6)
      const res1 = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );
      expect(res1.assignedAgentId).toBe('usr_agent_owner');

      // 2. When agent_owner is inactive, and agent_a and agent_b have same createdAt, tie-break by id asc
      usersStore.get('usr_agent_owner').isActive = false;
      usersStore.get('usr_agent_a').createdAt = new Date('2026-01-06');
      usersStore.get('usr_agent_b').createdAt = new Date('2026-01-06');
      // 'usr_agent_a' < 'usr_agent_b' alphabetically
      const res2 = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );
      expect(res2.assignedAgentId).toBe('usr_agent_a');
    });

    it('No eligible active agent: leaves request NEW and unassigned', async () => {
      // Deactivate all agents
      usersStore.get('usr_agent_owner').isActive = false;
      usersStore.get('usr_agent_a').isActive = false;
      usersStore.get('usr_agent_b').isActive = false;

      const res = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );

      expect(res.status).toBe(ContactRequestStatus.NEW);
      expect(res.assignedAgentId).toBeNull();

      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === res.id);
      expect(assign).toBeUndefined();
    });
  });

  describe('3. Privacy Allowlists & Access Control', () => {
    let testReqId: string;

    beforeEach(async () => {
      const created = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', message: 'Hello villa', contactConsent: true },
      );
      testReqId = created.id;
    });

    it('Buyer reads own request with full contact details and assigned agent summary', async () => {
      const detail: any = await service.getRequestDetail(testReqId, { id: 'usr_buyer_1', role: Role.BUYER });

      expect(detail.id).toBe(testReqId);
      expect(detail.buyer.email).toBe('buyer1@example.test');
      expect(detail.buyer.phone).toBe('0901000002');
      expect(detail.assignedAgent).toBeDefined();
      expect(detail.assignedAgent.email).toBeUndefined();
      expect(detail.accessContext.isBuyer).toBe(true);
      expect(detail.buyer.passwordHash).toBeUndefined();
    });

    it('Different buyer is denied access with 403 Forbidden', async () => {
      await expect(
        service.getRequestDetail(testReqId, { id: 'usr_buyer_2', role: Role.BUYER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Active assigned Agent sees buyer email/phone when contactConsent === true', async () => {
      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === testReqId);
      const agentId = assign.agentId;

      const detail: any = await service.getRequestDetail(testReqId, { id: agentId, role: Role.AGENT });

      expect(detail.buyer.fullName).toBe('Buyer User One');
      expect(detail.buyer.email).toBe('buyer1@example.test');
      expect(detail.buyer.phone).toBe('0901000002');
      expect(detail.accessContext.isAssignedAgent).toBe(true);
    });

    it('Active assigned Agent does NOT receive email/phone when contactConsent === false', async () => {
      // Simulate legacy record with contactConsent = false
      requestsStore.get(testReqId).contactConsent = false;
      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === testReqId);
      const agentId = assign.agentId;

      const detail: any = await service.getRequestDetail(testReqId, { id: agentId, role: Role.AGENT });

      expect(detail.buyer.fullName).toBe('Buyer User One');
      expect(detail.buyer.email).toBeUndefined();
      expect(detail.buyer.phone).toBeUndefined();
    });

    it('Listing owner receives restricted metadata-only allowlist (no buyer name/email/phone/message)', async () => {
      const detail: any = await service.getRequestDetail(testReqId, { id: 'usr_owner_1', role: Role.OWNER });

      expect(detail.id).toBe(testReqId);
      expect(detail.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(detail.listing.title).toBe('Approved Villa by Owner 1');
      expect(detail.accessContext.isListingOwner).toBe(true);

      // Must NOT expose buyer or message
      expect(detail.buyer).toBeUndefined();
      expect(detail.buyerId).toBeUndefined();
      expect(detail.message).toBeUndefined();
      expect(detail.assignedAgent).toBeUndefined();
    });

    it('ADMIN sees permitted details and complete buyer contact info', async () => {
      const detail: any = await service.getRequestDetail(testReqId, { id: 'usr_admin', role: Role.ADMIN });

      expect(detail.id).toBe(testReqId);
      expect(detail.buyer.email).toBe('buyer1@example.test');
      expect(detail.buyer.phone).toBe('0901000002');
      expect(detail.accessContext.isAdmin).toBe(true);
      expect(detail.buyer.passwordHash).toBeUndefined();
    });

    it('Historical (released) Agent immediately loses access with 403 Forbidden', async () => {
      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === testReqId);
      assign.isActive = false;
      assign.releasedAt = new Date();

      await expect(
        service.getRequestDetail(testReqId, { id: assign.agentId, role: Role.AGENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Unrelated Agent receives 403 Forbidden', async () => {
      await expect(
        service.getRequestDetail(testReqId, { id: 'usr_agent_b', role: Role.AGENT }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. State Machine & Status Updates', () => {
    let testReqId: string;
    let agentId: string;

    beforeEach(async () => {
      const created = await service.createRequest(
        { id: 'usr_buyer_1', role: Role.BUYER },
        { listingId: 'lst_approved_owner1', contactConsent: true },
      );
      testReqId = created.id;
      const assign = Array.from(assignmentsStore.values()).find((a) => a.contactRequestId === testReqId);
      agentId = assign.agentId;
    });

    it('Active assigned Agent can transition IN_PROGRESS -> COMPLETED', async () => {
      const res = await service.updateStatus(
        testReqId,
        { id: agentId, role: Role.AGENT },
        { status: ContactRequestStatus.COMPLETED, note: 'Consultation concluded' },
      );

      expect(res.status).toBe(ContactRequestStatus.COMPLETED);

      const audit = auditLogsStore.find((a) => a.action === 'request.status_change');
      expect(audit).toBeDefined();
      expect(audit.meta.fromStatus).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(audit.meta.toStatus).toBe(ContactRequestStatus.COMPLETED);
    });

    it('Active assigned Agent can transition IN_PROGRESS -> REJECTED', async () => {
      const res = await service.updateStatus(
        testReqId,
        { id: agentId, role: Role.AGENT },
        { status: ContactRequestStatus.REJECTED, note: 'Buyer unresponsive' },
      );

      expect(res.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('Agent cannot transition from terminal COMPLETED state (400)', async () => {
      await service.updateStatus(
        testReqId,
        { id: agentId, role: Role.AGENT },
        { status: ContactRequestStatus.COMPLETED },
      );

      await expect(
        service.updateStatus(
          testReqId,
          { id: agentId, role: Role.AGENT },
          { status: ContactRequestStatus.IN_PROGRESS },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Agent cannot transition directly from NEW to COMPLETED (400)', async () => {
      requestsStore.get(testReqId).status = ContactRequestStatus.NEW;

      await expect(
        service.updateStatus(
          testReqId,
          { id: agentId, role: Role.AGENT },
          { status: ContactRequestStatus.COMPLETED },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Only ADMIN can reopen terminal request with a mandatory reason', async () => {
      await service.updateStatus(
        testReqId,
        { id: agentId, role: Role.AGENT },
        { status: ContactRequestStatus.COMPLETED },
      );

      const reopenRes = await service.reopenRequest(
        testReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { reason: 'Buyer requested follow-up inspection' },
      );

      expect(reopenRes.status).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(reopenRes.reason).toBe('Buyer requested follow-up inspection');

      const audit = auditLogsStore.find((a) => a.action === 'request.reopen');
      expect(audit).toBeDefined();
      expect(audit.meta.previousStatus).toBe(ContactRequestStatus.COMPLETED);
      expect(audit.meta.newStatus).toBe(ContactRequestStatus.IN_PROGRESS);
    });

    it('Reopen rejects empty or whitespace-only reason (400)', async () => {
      requestsStore.get(testReqId).status = ContactRequestStatus.COMPLETED;

      await expect(
        service.reopenRequest(
          testReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { reason: '   ' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Active Agent attempts IN_PROGRESS -> NEW: rejected (400)', async () => {
      await expect(
        service.updateStatus(
          testReqId,
          { id: agentId, role: Role.AGENT },
          { status: ContactRequestStatus.NEW },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ADMIN attempts IN_PROGRESS -> NEW through PATCH: rejected (400)', async () => {
      await expect(
        service.updateStatus(
          testReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { status: ContactRequestStatus.NEW },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ADMIN attempts NEW -> IN_PROGRESS through PATCH without assignment: rejected (400)', async () => {
      requestsStore.get(testReqId).status = ContactRequestStatus.NEW;
      await expect(
        service.updateStatus(
          testReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { status: ContactRequestStatus.IN_PROGRESS },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ADMIN can reject a NEW unassigned request (200)', async () => {
      requestsStore.get(testReqId).status = ContactRequestStatus.NEW;
      const res = await service.updateStatus(
        testReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { status: ContactRequestStatus.REJECTED },
      );
      expect(res.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('ADMIN can complete an IN_PROGRESS request (200)', async () => {
      const res = await service.updateStatus(
        testReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { status: ContactRequestStatus.COMPLETED },
      );
      expect(res.status).toBe(ContactRequestStatus.COMPLETED);
    });

    it('ADMIN can reject an IN_PROGRESS request (200)', async () => {
      const res = await service.updateStatus(
        testReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { status: ContactRequestStatus.REJECTED },
      );
      expect(res.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('Reject unchanged status with 400 Bad Request', async () => {
      await expect(
        service.updateStatus(
          testReqId,
          { id: agentId, role: Role.AGENT },
          { status: ContactRequestStatus.IN_PROGRESS },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Assignments & Reassignment', () => {
    let unassignedReqId: string;

    beforeEach(() => {
      // Create an unassigned NEW request
      const reqId = 'req_unassigned_1';
      requestsStore.set(reqId, {
        id: reqId,
        listingId: 'lst_approved_owner1',
        buyerId: 'usr_buyer_1',
        message: 'Unassigned request',
        contactConsent: true,
        status: ContactRequestStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      unassignedReqId = reqId;
    });

    it('Admin can assign an active agent once, transitioning request to IN_PROGRESS', async () => {
      const res = await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a', reason: 'Initial dispatch' },
      );

      expect(res.agentId).toBe('usr_agent_a');
      expect(res.isActive).toBe(true);
      expect(res.requestStatus).toBe(ContactRequestStatus.IN_PROGRESS);

      const assignAudit = auditLogsStore.find((a) => a.action === 'request.assign');
      expect(assignAudit).toBeDefined();
      expect(assignAudit.actorId).toBe('usr_admin');
    });

    it('Admin cannot call first assign when an active assignment already exists (409 Conflict)', async () => {
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );

      await expect(
        service.assignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_b' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('Admin reassignment releases old assignment and creates new active assignment, preserving history', async () => {
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );

      const reassignRes = await service.reassignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_b', reason: 'Workload balancing' },
      );

      expect(reassignRes.agentId).toBe('usr_agent_b');
      expect(reassignRes.previousAgentId).toBe('usr_agent_a');
      expect(reassignRes.isActive).toBe(true);

      // Verify old assignment is inactive with releasedAt
      const allAssigns = Array.from(assignmentsStore.values()).filter(
        (a) => a.contactRequestId === unassignedReqId,
      );
      expect(allAssigns.length).toBe(2);

      const oldAssign = allAssigns.find((a) => a.agentId === 'usr_agent_a');
      expect(oldAssign.isActive).toBe(false);
      expect(oldAssign.releasedAt).toBeDefined();

      const newAssign = allAssigns.find((a) => a.agentId === 'usr_agent_b');
      expect(newAssign.isActive).toBe(true);
      expect(newAssign.releasedAt).toBeNull();

      // Old agent immediately loses access
      await expect(
        service.getRequestDetail(unassignedReqId, { id: 'usr_agent_a', role: Role.AGENT }),
      ).rejects.toThrow(ForbiddenException);

      // New agent has access
      const detail = await service.getRequestDetail(unassignedReqId, { id: 'usr_agent_b', role: Role.AGENT });
      expect(detail).toBeDefined();
    });

    it('Reassigning to the currently active agent is rejected with 400 Bad Request', async () => {
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );

      await expect(
        service.reassignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_a' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Cannot assign or reassign an inactive agent (400 Bad Request)', async () => {
      await expect(
        service.assignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_inactive' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Cannot reassign a terminal request before reopening (400 Bad Request)', async () => {
      requestsStore.get(unassignedReqId).status = ContactRequestStatus.COMPLETED;

      await expect(
        service.reassignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_b' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Admin and active assigned agent can view assignment history', async () => {
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );
      await service.reassignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_b' },
      );

      const history = await service.getAssignmentHistory(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
      );
      expect(history.assignments.length).toBe(2);
      expect(history.assignments[0].agentId).toBe('usr_agent_a');
      expect(history.assignments[1].agentId).toBe('usr_agent_b');

      // Active agent can also view history
      const agentHistory = await service.getAssignmentHistory(
        unassignedReqId,
        { id: 'usr_agent_b', role: Role.AGENT },
      );
      expect(agentHistory.assignments.length).toBe(2);

      // Released agent cannot view history (403)
      await expect(
        service.getAssignmentHistory(
          unassignedReqId,
          { id: 'usr_agent_a', role: Role.AGENT },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Reassignment without a current active Agent returns 409 Conflict', async () => {
      await expect(
        service.reassignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_b' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('Admin getAllRequests rejects combination of agentId and unassigned=true (400)', async () => {
      await expect(
        service.getAllRequests({ agentId: 'usr_agent_a', unassigned: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Scenario A: assignAgent fails with 409 Conflict if request status changed concurrently after read (e.g. to REJECTED)', async () => {
      const updateManySpy = vi.spyOn(mockPrismaService.contactRequest, 'updateMany').mockResolvedValueOnce({ count: 0 });

      await expect(
        service.assignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_a' },
        ),
      ).rejects.toThrow(ConflictException);

      updateManySpy.mockRestore();
    });

    it('Scenario B: reassignAgent fails with 409 Conflict if request status changed concurrently after read (e.g. to COMPLETED)', async () => {
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );

      const updateManySpy = vi.spyOn(mockPrismaService.contactRequest, 'updateMany').mockResolvedValueOnce({ count: 0 });

      await expect(
        service.reassignAgent(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { agentId: 'usr_agent_b' },
        ),
      ).rejects.toThrow(ConflictException);

      updateManySpy.mockRestore();
    });

    it('reopenRequest fails with 409 Conflict if request status changed concurrently after read', async () => {
      requestsStore.get(unassignedReqId).status = ContactRequestStatus.REJECTED;

      const updateManySpy = vi.spyOn(mockPrismaService.contactRequest, 'updateMany').mockResolvedValueOnce({ count: 0 });

      await expect(
        service.reopenRequest(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { reason: 'Admin reopen' },
        ),
      ).rejects.toThrow(ConflictException);

      updateManySpy.mockRestore();
    });
    it('Scenario A (opposite serialization): if assignAgent wins first, request becomes IN_PROGRESS and subsequent status transitions follow matrix', async () => {
      const assignRes = await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );
      expect(assignRes.requestStatus).toBe(ContactRequestStatus.IN_PROGRESS);

      // Now as IN_PROGRESS, attempt to transition back to NEW is rejected with 400
      await expect(
        service.updateStatus(
          unassignedReqId,
          { id: 'usr_admin', role: Role.ADMIN },
          { status: ContactRequestStatus.NEW },
        ),
      ).rejects.toThrow(BadRequestException);

      // But transition to REJECTED succeeds
      const rejectRes = await service.updateStatus(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { status: ContactRequestStatus.REJECTED },
      );
      expect(rejectRes.status).toBe(ContactRequestStatus.REJECTED);
    });

    it('Scenario B (opposite serialization): if reassignAgent wins first, new active agent can complete the request', async () => {
      // Setup: request is IN_PROGRESS with agent A
      await service.assignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_a' },
      );
      const reassignRes = await service.reassignAgent(
        unassignedReqId,
        { id: 'usr_admin', role: Role.ADMIN },
        { agentId: 'usr_agent_b' },
      );
      expect(reassignRes.requestStatus).toBe(ContactRequestStatus.IN_PROGRESS);
      expect(reassignRes.agentId).toBe('usr_agent_b');

      // Old agent (A) attempts to complete -> 403 Forbidden
      await expect(
        service.updateStatus(
          unassignedReqId,
          { id: 'usr_agent_a', role: Role.AGENT },
          { status: ContactRequestStatus.COMPLETED },
        ),
      ).rejects.toThrow(ForbiddenException);

      // New agent (B) completes the request -> 200 OK
      const completeRes = await service.updateStatus(
        unassignedReqId,
        { id: 'usr_agent_b', role: Role.AGENT },
        { status: ContactRequestStatus.COMPLETED },
      );
      expect(completeRes.status).toBe(ContactRequestStatus.COMPLETED);
    });
  });
});
