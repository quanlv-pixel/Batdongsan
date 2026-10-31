import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MlsService } from './mls.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ListingStatus,
  MlsSharePermission,
  PropertyType,
  Role,
  TransactionType,
} from '../generated/prisma/enums.js';

describe('MlsService Unit Tests (Phase 2D-1)', () => {
  let mlsService: MlsService;

  // In-memory test store
  let usersStore: Map<string, any>;
  let listingsStore: Map<string, any>;
  let mlsSharesStore: Map<string, any>;
  let auditLogsStore: any[];

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
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
    },
    listing: {
      findUnique: vi.fn(async ({ where, select, include }: { where: { id: string }; select?: any; include?: any }) => {
        const listing = listingsStore.get(where.id);
        if (!listing) return null;
        const owner = usersStore.get(listing.ownerId);

        if (include) {
          return {
            ...listing,
            images: listing.images ?? [],
            owner: owner
              ? {
                  id: owner.id,
                  fullName: owner.fullName,
                  email: owner.email,
                  phone: owner.phone,
                  isActive: owner.isActive,
                }
              : null,
          };
        }

        if (select) {
          const res: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) res[k] = listing[k];
          }
          return res;
        }
        return listing;
      }),
    },
    mlsShare: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: any }) => {
        const share = mlsSharesStore.get(where.id);
        if (!share) return null;
        if (include?.listing) {
          const listing = listingsStore.get(share.listingId);
          return {
            ...share,
            listing: listing
              ? { id: listing.id, ownerId: listing.ownerId, status: listing.status }
              : null,
          };
        }
        return share;
      }),
      findFirst: vi.fn(async ({ where, select }: { where: any; select?: any }) => {
        for (const s of mlsSharesStore.values()) {
          let match = true;
          if (where.listingId && s.listingId !== where.listingId) match = false;
          if (where.receivedById && s.receivedById !== where.receivedById) match = false;
          if (where.isActive !== undefined && s.isActive !== where.isActive) match = false;
          if (where.OR && Array.isArray(where.OR)) {
            const now = new Date();
            const expiresAtOk =
              s.expiresAt === null ||
              (s.expiresAt instanceof Date ? s.expiresAt > now : new Date(s.expiresAt) > now);
            if (!expiresAtOk) match = false;
          }
          if (match) {
            if (select) {
              const res: any = {};
              for (const [k, v] of Object.entries(select)) {
                if (v) res[k] = s[k];
              }
              return res;
            }
            return s;
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, skip, take, select }: any) => {
        const results: any[] = [];
        for (const s of mlsSharesStore.values()) {
          let match = true;
          if (where.listingId && s.listingId !== where.listingId) match = false;
          if (where.receivedById && s.receivedById !== where.receivedById) match = false;
          if (where.isActive !== undefined && s.isActive !== where.isActive) match = false;
          if (where.OR && Array.isArray(where.OR)) {
            const now = new Date();
            const expiresAtOk =
              s.expiresAt === null ||
              (s.expiresAt instanceof Date ? s.expiresAt > now : new Date(s.expiresAt) > now);
            if (!expiresAtOk) match = false;
          }
          if (where.listing) {
            const lst = listingsStore.get(s.listingId);
            if (!lst) match = false;
            else {
              if (where.listing.status && lst.status !== where.listing.status) match = false;
              if (where.listing.owner?.isActive !== undefined) {
                const owner = usersStore.get(lst.ownerId);
                if (owner?.isActive !== where.listing.owner.isActive) match = false;
              }
              if (where.listing.province?.contains) {
                if (!lst.province.toLowerCase().includes(where.listing.province.contains.toLowerCase())) {
                  match = false;
                }
              }
              if (where.listing.district?.contains) {
                if (!lst.district.toLowerCase().includes(where.listing.district.contains.toLowerCase())) {
                  match = false;
                }
              }
              if (where.listing.propertyType && lst.propertyType !== where.listing.propertyType) {
                match = false;
              }
              if (where.listing.transactionType && lst.transactionType !== where.listing.transactionType) {
                match = false;
              }
            }
          }
          if (match) {
            let transformed: any = s;
            if (select) {
              transformed = {};
              if (select.id) transformed.id = s.id;
              if (select.permission) transformed.permission = s.permission;
              if (select.isActive !== undefined) transformed.isActive = s.isActive;
              if (select.revokedAt !== undefined) transformed.revokedAt = s.revokedAt;
              if (select.expiresAt !== undefined) transformed.expiresAt = s.expiresAt;
              if (select.createdAt) transformed.createdAt = s.createdAt;
              if (select.listing) {
                const lst = listingsStore.get(s.listingId);
                const owner = usersStore.get(lst?.ownerId);
                transformed.listing = lst
                  ? {
                      ...lst,
                      owner: owner
                        ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone }
                        : null,
                    }
                  : null;
              }
              if (select.grantedBy) {
                const gb = usersStore.get(s.grantedById);
                transformed.grantedBy = gb
                  ? { id: gb.id, fullName: gb.fullName, email: gb.email }
                  : null;
              }
              if (select.receivedBy) {
                const rb = usersStore.get(s.receivedById);
                transformed.receivedBy = rb
                  ? { id: rb.id, fullName: rb.fullName, email: rb.email, phone: rb.phone }
                  : null;
              }
            }
            results.push(transformed);
          }
        }
        return results.slice(skip ?? 0, (skip ?? 0) + (take ?? 20));
      }),
      count: vi.fn(async ({ where }: any) => {
        let count = 0;
        for (const s of mlsSharesStore.values()) {
          let match = true;
          if (where.listingId && s.listingId !== where.listingId) match = false;
          if (where.receivedById && s.receivedById !== where.receivedById) match = false;
          if (where.isActive !== undefined && s.isActive !== where.isActive) match = false;
          if (where.OR && Array.isArray(where.OR)) {
            const now = new Date();
            const expiresAtOk =
              s.expiresAt === null ||
              (s.expiresAt instanceof Date ? s.expiresAt > now : new Date(s.expiresAt) > now);
            if (!expiresAtOk) match = false;
          }
          if (where.listing) {
            const lst = listingsStore.get(s.listingId);
            if (!lst) match = false;
            else {
              if (where.listing.status && lst.status !== where.listing.status) match = false;
              if (where.listing.owner?.isActive !== undefined) {
                const owner = usersStore.get(lst.ownerId);
                if (owner?.isActive !== where.listing.owner.isActive) match = false;
              }
            }
          }
          if (match) count++;
        }
        return count;
      }),
      create: vi.fn(async ({ data, include }: any) => {
        const id = `mls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const share = {
          id,
          ...data,
          createdAt: new Date(),
          revokedAt: null,
        };
        mlsSharesStore.set(id, share);
        const listing = listingsStore.get(share.listingId);
        const grantedBy = usersStore.get(share.grantedById);
        const receivedBy = usersStore.get(share.receivedById);
        return {
          ...share,
          ...(include?.listing && {
            listing: { id: listing.id, title: listing.title, status: listing.status },
          }),
          ...(include?.grantedBy && {
            grantedBy: { id: grantedBy.id, fullName: grantedBy.fullName, email: grantedBy.email },
          }),
          ...(include?.receivedBy && {
            receivedBy: {
              id: receivedBy.id,
              fullName: receivedBy.fullName,
              email: receivedBy.email,
              phone: receivedBy.phone,
            },
          }),
        };
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [id, s] of mlsSharesStore.entries()) {
          if (s.id === where.id) {
            if (where.isActive !== undefined && s.isActive !== where.isActive) continue;
            mlsSharesStore.set(id, { ...s, ...data });
            count++;
          }
        }
        return { count };
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const log = {
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ...data,
          createdAt: new Date(),
        };
        auditLogsStore.push(log);
        return log;
      }),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => {
      return callback(mockPrismaService);
    }),
  };

  beforeEach(() => {
    usersStore = new Map();
    listingsStore = new Map();
    mlsSharesStore = new Map();
    auditLogsStore = [];

    // Seed test users
    usersStore.set('usr_owner', {
      id: 'usr_owner',
      email: 'owner@example.com',
      fullName: 'Owner User',
      phone: '0901111111',
      role: Role.OWNER,
      isActive: true,
    });

    usersStore.set('usr_agent_1', {
      id: 'usr_agent_1',
      email: 'agent1@example.com',
      fullName: 'Agent Alpha',
      phone: '0902222222',
      role: Role.AGENT,
      isActive: true,
    });

    usersStore.set('usr_agent_2', {
      id: 'usr_agent_2',
      email: 'agent2@example.com',
      fullName: 'Agent Beta',
      phone: '0903333333',
      role: Role.AGENT,
      isActive: true,
    });

    usersStore.set('usr_agent_inactive', {
      id: 'usr_agent_inactive',
      email: 'inactive_agent@example.com',
      fullName: 'Inactive Agent',
      phone: '0904444444',
      role: Role.AGENT,
      isActive: false,
    });

    usersStore.set('usr_buyer', {
      id: 'usr_buyer',
      email: 'buyer@example.com',
      fullName: 'Buyer User',
      phone: '0905555555',
      role: Role.BUYER,
      isActive: true,
    });

    usersStore.set('usr_admin', {
      id: 'usr_admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
      phone: '0909999999',
      role: Role.ADMIN,
      isActive: true,
    });

    // Seed test listings
    listingsStore.set('lst_approved', {
      id: 'lst_approved',
      title: 'Luxury Villa Thao Dien',
      description: 'Prime location villa',
      propertyType: PropertyType.VILLA,
      transactionType: TransactionType.FOR_SALE,
      priceVnd: 25000000000n,
      rentalPeriod: null,
      areaSqm: 350.5,
      province: 'Ho Chi Minh',
      district: 'Thu Duc',
      ward: 'Thao Dien',
      streetAddress: '123 Nguyen Van Huong',
      latitude: 10.803,
      longitude: 106.732,
      status: ListingStatus.APPROVED,
      ownerId: 'usr_owner',
      images: [{ id: 'img_1', url: 'https://example.com/1.jpg', order: 0 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    listingsStore.set('lst_draft', {
      id: 'lst_draft',
      title: 'Draft Apartment',
      description: 'Not approved yet',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_RENT,
      priceVnd: 15000000n,
      rentalPeriod: 'MONTH',
      areaSqm: 65,
      province: 'Ho Chi Minh',
      district: 'Binh Thanh',
      ward: 'Ward 22',
      streetAddress: '456 Dien Bien Phu',
      latitude: 10.798,
      longitude: 106.713,
      status: ListingStatus.DRAFT,
      ownerId: 'usr_owner',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    listingsStore.set('lst_agent_owned', {
      id: 'lst_agent_owned',
      title: 'Agent Owned Shophouse',
      description: 'Listing created and owned by Agent Alpha',
      propertyType: PropertyType.COMMERCIAL,
      transactionType: TransactionType.FOR_SALE,
      priceVnd: 18000000000n,
      rentalPeriod: null,
      areaSqm: 180,
      province: 'Ho Chi Minh',
      district: 'District 1',
      ward: 'Ben Nghe',
      streetAddress: '10 Dong Khoi',
      latitude: 10.776,
      longitude: 106.703,
      status: ListingStatus.APPROVED,
      ownerId: 'usr_agent_1',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mlsService = new MlsService(mockPrismaService as unknown as PrismaService);
  });

  describe('1. grantShare', () => {
    it('successfully grants VIEW access on an APPROVED listing to an active AGENT recipient', async () => {
      const result = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        {
          listingId: 'lst_approved',
          recipientId: 'usr_agent_1',
          permission: MlsSharePermission.VIEW,
        },
      );

      expect(result).toBeDefined();
      expect(result.listingId).toBe('lst_approved');
      expect(result.grantedById).toBe('usr_owner');
      expect(result.receivedById).toBe('usr_agent_1');
      expect(result.permission).toBe(MlsSharePermission.VIEW);
      expect(result.isActive).toBe(true);

      // Audit log created
      const audit = auditLogsStore.find((a) => a.action === 'mls.grant');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe('usr_owner');
      expect(audit.entityType).toBe('MlsShare');
    });

    it('successfully grants MANAGE access with future expiresAt', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7); // 7 days later
      const result = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        {
          listingId: 'lst_approved',
          recipientId: 'usr_agent_2',
          permission: MlsSharePermission.MANAGE,
          expiresAt: futureDate,
        },
      );

      expect(result.permission).toBe(MlsSharePermission.MANAGE);
      expect(result.expiresAt).toEqual(futureDate);
    });

    it('rejects self-sharing with 400 BadRequestException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_approved', recipientId: 'usr_owner' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects past expiresAt with 400 BadRequestException', async () => {
      const pastDate = new Date(Date.now() - 10000);
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          {
            listingId: 'lst_approved',
            recipientId: 'usr_agent_1',
            expiresAt: pastDate,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-existent recipient with 404 NotFoundException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_approved', recipientId: 'usr_non_existent' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects inactive recipient with 400 BadRequestException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_approved', recipientId: 'usr_agent_inactive' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-AGENT recipient with 400 BadRequestException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_approved', recipientId: 'usr_buyer' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-existent listing with 404 NotFoundException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_unknown', recipientId: 'usr_agent_1' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects sharing non-APPROVED listings with 400 BadRequestException', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_draft', recipientId: 'usr_agent_1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects grant by non-owner with 403 ForbiddenException (recipients cannot re-share)', async () => {
      await expect(
        mlsService.grantShare(
          { id: 'usr_agent_1', role: Role.AGENT },
          { listingId: 'lst_approved', recipientId: 'usr_agent_2' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate active grants with 409 ConflictException', async () => {
      // First grant
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      // Duplicate grant attempt
      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('re-grant succeeds after previous share is revoked (preserves grant history)', async () => {
      // 1. Initial grant
      const firstShare = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      // 2. Revoke initial grant
      await mlsService.revokeShare(firstShare.id, { id: 'usr_owner', role: Role.OWNER });

      // 3. Re-grant same listing to same agent
      const secondShare = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1', permission: MlsSharePermission.MANAGE },
      );

      expect(secondShare.id).not.toBe(firstShare.id);
      expect(secondShare.isActive).toBe(true);
      expect(secondShare.permission).toBe(MlsSharePermission.MANAGE);

      // Verify first share is still in store as revoked
      const archived = mlsSharesStore.get(firstShare.id);
      expect(archived.isActive).toBe(false);
      expect(archived.revokedAt).toBeDefined();
    });

    it('an active AGENT who owns an APPROVED listing can grant MLS access to another AGENT', async () => {
      const result = await mlsService.grantShare(
        { id: 'usr_agent_1', role: Role.AGENT },
        {
          listingId: 'lst_agent_owned',
          recipientId: 'usr_agent_2',
          permission: MlsSharePermission.VIEW,
        },
      );

      expect(result).toBeDefined();
      expect(result.listingId).toBe('lst_agent_owned');
      expect(result.grantedById).toBe('usr_agent_1');
      expect(result.receivedById).toBe('usr_agent_2');
      expect(result.isActive).toBe(true);

      // Recipient cannot re-share listing owned by someone else
      await expect(
        mlsService.grantShare(
          { id: 'usr_agent_2', role: Role.AGENT },
          {
            listingId: 'lst_agent_owned',
            recipientId: 'usr_owner',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('re-grant automatically retires an expired-but-isActive share, clearing partial unique index and preserving history', async () => {
      // 1. Manually insert an expired-but-isActive share
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const expiredShareId = 'mls_expired_test_01';
      mlsSharesStore.set(expiredShareId, {
        id: expiredShareId,
        listingId: 'lst_approved',
        grantedById: 'usr_owner',
        receivedById: 'usr_agent_1',
        permission: MlsSharePermission.VIEW,
        expiresAt: pastDate,
        isActive: true, // expired but isActive flag was not yet cleared
        createdAt: new Date(Date.now() - 7200000),
        revokedAt: null,
      });

      // 2. Granting to the same recipient should NOT conflict with 409
      const newShare = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        {
          listingId: 'lst_approved',
          recipientId: 'usr_agent_1',
          permission: MlsSharePermission.MANAGE,
        },
      );

      expect(newShare.id).not.toBe(expiredShareId);
      expect(newShare.isActive).toBe(true);
      expect(newShare.permission).toBe(MlsSharePermission.MANAGE);

      // 3. Verify old expired share was retired cleanly (isActive = false, revokedAt set)
      const oldRecord = mlsSharesStore.get(expiredShareId);
      expect(oldRecord.isActive).toBe(false);
      expect(oldRecord.revokedAt).toBeDefined();

      // 4. Verify audit log for mls.expire was written
      const expireLog = auditLogsStore.find((a) => a.action === 'mls.expire');
      expect(expireLog).toBeDefined();
      expect(expireLog.entityId).toBe(expiredShareId);
    });

    it('rolls back transaction and does not persist share if audit log creation fails', async () => {
      mockPrismaService.auditLog.create.mockRejectedValueOnce(
        new Error('Audit database disk failure'),
      );

      await expect(
        mlsService.grantShare(
          { id: 'usr_owner', role: Role.OWNER },
          {
            listingId: 'lst_approved',
            recipientId: 'usr_agent_2',
          },
        ),
      ).rejects.toThrow('Audit database disk failure');
    });
  });

  describe('2. revokeShare', () => {
    it('listing owner can revoke an active share', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      const revoked = await mlsService.revokeShare(
        share.id,
        { id: 'usr_owner', role: Role.OWNER },
        { reason: 'Contract expired' },
      );

      expect(revoked.isActive).toBe(false);
      expect(revoked.revokedAt).toBeDefined();

      const audit = auditLogsStore.find((a) => a.action === 'mls.revoke');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe('usr_owner');
      expect(audit.meta.reason).toBe('Contract expired');
    });

    it('ADMIN can revoke any active share for oversight', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      const revoked = await mlsService.revokeShare(
        share.id,
        { id: 'usr_admin', role: Role.ADMIN },
        { reason: 'Administrative audit action' },
      );

      expect(revoked.isActive).toBe(false);
      const audit = auditLogsStore.find(
        (a) => a.action === 'mls.revoke' && a.actorId === 'usr_admin',
      );
      expect(audit).toBeDefined();
    });

    it('rejects revocation by non-owner, non-ADMIN with 403 ForbiddenException', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      await expect(
        mlsService.revokeShare(share.id, { id: 'usr_agent_2', role: Role.AGENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects revocation of non-existent share with 404 NotFoundException', async () => {
      await expect(
        mlsService.revokeShare('mls_unknown', { id: 'usr_owner', role: Role.OWNER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('an active AGENT who owns the listing can revoke a share', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_agent_1', role: Role.AGENT },
        { listingId: 'lst_agent_owned', recipientId: 'usr_agent_2' },
      );

      const revoked = await mlsService.revokeShare(
        share.id,
        { id: 'usr_agent_1', role: Role.AGENT },
      );

      expect(revoked.isActive).toBe(false);
      expect(revoked.revokedAt).toBeDefined();
    });

    it('rolls back transaction and keeps share active if audit log creation fails during revoke', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      mockPrismaService.auditLog.create.mockRejectedValueOnce(
        new Error('Audit log failure during revoke'),
      );

      await expect(
        mlsService.revokeShare(share.id, { id: 'usr_owner', role: Role.OWNER }),
      ).rejects.toThrow('Audit log failure during revoke');
    });

    it('rejects already revoked share with 400 BadRequestException', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      await mlsService.revokeShare(share.id, { id: 'usr_owner', role: Role.OWNER });

      await expect(
        mlsService.revokeShare(share.id, { id: 'usr_owner', role: Role.OWNER }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. getReceivedShares', () => {
    it('returns active, non-expired shares received by the authenticated agent with pagination', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      const res = await mlsService.getReceivedShares('usr_agent_1', { page: 1, limit: 10 });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].listing.id).toBe('lst_approved');
      expect(typeof res.data[0].listing.priceVnd).toBe('string');
      // VIEW share omits streetAddress, exact coordinates, and owner email/phone
      expect(res.data[0].listing.streetAddress).toBeUndefined();
      expect(res.data[0].listing.latitude).toBeUndefined();
      expect(res.data[0].listing.longitude).toBeUndefined();
      expect(res.data[0].listing.owner.fullName).toBe('Owner User');
      expect(res.data[0].listing.owner.email).toBeUndefined();
      expect(res.data[0].listing.owner.phone).toBeUndefined();
      expect(res.meta.total).toBe(1);
      expect(res.meta.page).toBe(1);
    });

    it('returns streetAddress and coordinates for MANAGE in received list, but omits owner email/phone', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_2', permission: MlsSharePermission.MANAGE },
      );

      const res = await mlsService.getReceivedShares('usr_agent_2', { page: 1, limit: 10 });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].permission).toBe(MlsSharePermission.MANAGE);
      expect(res.data[0].listing.streetAddress).toBe('123 Nguyen Van Huong');
      expect(res.data[0].listing.latitude).toBe(10.803);
      expect(res.data[0].listing.longitude).toBe(106.732);
      expect(res.data[0].listing.owner.fullName).toBe('Owner User');
      expect(res.data[0].listing.owner.email).toBeUndefined();
      expect(res.data[0].listing.owner.phone).toBeUndefined();
    });

    it('excludes revoked shares from received list', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      await mlsService.revokeShare(share.id, { id: 'usr_owner', role: Role.OWNER });

      const res = await mlsService.getReceivedShares('usr_agent_1', {});
      expect(res.data).toHaveLength(0);
      expect(res.meta.total).toBe(0);
    });
  });

  describe('4. getListingShareHistory', () => {
    it('allows listing owner to view share history (both active and revoked)', async () => {
      const share1 = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );
      await mlsService.revokeShare(share1.id, { id: 'usr_owner', role: Role.OWNER });

      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      const history = await mlsService.getListingShareHistory(
        'lst_approved',
        { id: 'usr_owner', role: Role.OWNER },
        {},
      );

      expect(history.data).toHaveLength(2);
      expect(history.meta.total).toBe(2);
    });

    it('allows ADMIN to inspect share history for oversight', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      const history = await mlsService.getListingShareHistory(
        'lst_approved',
        { id: 'usr_admin', role: Role.ADMIN },
        {},
      );

      expect(history.data).toHaveLength(1);
    });

    it('an active AGENT who owns the listing can view share history, while a recipient cannot', async () => {
      await mlsService.grantShare(
        { id: 'usr_agent_1', role: Role.AGENT },
        { listingId: 'lst_agent_owned', recipientId: 'usr_agent_2' },
      );

      // Owner (AGENT) can view history
      const history = await mlsService.getListingShareHistory(
        'lst_agent_owned',
        { id: 'usr_agent_1', role: Role.AGENT },
        {},
      );
      expect(history.data).toHaveLength(1);

      // Recipient (AGENT) cannot view history
      await expect(
        mlsService.getListingShareHistory(
          'lst_agent_owned',
          { id: 'usr_agent_2', role: Role.AGENT },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects unauthorized users from inspecting share history with 403 ForbiddenException', async () => {
      await expect(
        mlsService.getListingShareHistory(
          'lst_approved',
          { id: 'usr_agent_2', role: Role.AGENT },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects non-existent listing with 404 NotFoundException', async () => {
      await expect(
        mlsService.getListingShareHistory(
          'lst_unknown',
          { id: 'usr_admin', role: Role.ADMIN },
          {},
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. getSharedListingDetail (Authorized internal detail access)', () => {
    it('AGENT receiving VIEW: may view permitted listing info but strictly omits streetAddress, coordinates, and owner email/phone', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1', permission: MlsSharePermission.VIEW },
      );

      const detail = await mlsService.getSharedListingDetail('lst_approved', {
        id: 'usr_agent_1',
        role: Role.AGENT,
      });

      expect(detail).toBeDefined();
      expect(detail.id).toBe('lst_approved');
      expect(detail.province).toBe('Ho Chi Minh');
      expect(detail.district).toBe('Thu Duc');
      expect(detail.ward).toBe('Thao Dien');

      // Restricted fields MUST be omitted entirely for VIEW
      expect(detail.streetAddress).toBeUndefined();
      expect(detail.latitude).toBeUndefined();
      expect(detail.longitude).toBeUndefined();

      // Owner contact email and phone MUST be omitted
      expect(detail.owner.id).toBe('usr_owner');
      expect(detail.owner.fullName).toBe('Owner User');
      expect(detail.owner.email).toBeUndefined();
      expect(detail.owner.phone).toBeUndefined();
      expect((detail.owner as any).passwordHash).toBeUndefined();

      expect(detail.accessContext.role).toBe(Role.AGENT);
      expect(detail.accessContext.permission).toBe(MlsSharePermission.VIEW);
    });

    it('AGENT receiving MANAGE: includes streetAddress and coordinates, but strictly omits owner email/phone', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_2', permission: MlsSharePermission.MANAGE },
      );

      const detail = await mlsService.getSharedListingDetail('lst_approved', {
        id: 'usr_agent_2',
        role: Role.AGENT,
      });

      expect(detail).toBeDefined();
      expect(detail.id).toBe('lst_approved');

      // streetAddress and exact coordinates permitted for MANAGE
      expect(detail.streetAddress).toBe('123 Nguyen Van Huong');
      expect(detail.latitude).toBe(10.803);
      expect(detail.longitude).toBe(106.732);

      // Owner contact email and phone MUST still be omitted
      expect(detail.owner.fullName).toBe('Owner User');
      expect(detail.owner.email).toBeUndefined();
      expect(detail.owner.phone).toBeUndefined();
      expect((detail.owner as any).passwordHash).toBeUndefined();

      expect(detail.accessContext.role).toBe(Role.AGENT);
      expect(detail.accessContext.permission).toBe(MlsSharePermission.MANAGE);
    });

    it('listing owner and ADMIN retain permitted detail access including streetAddress, coordinates, and owner contacts', async () => {
      const ownerDetail = await mlsService.getSharedListingDetail('lst_approved', {
        id: 'usr_owner',
        role: Role.OWNER,
      });
      expect(ownerDetail.accessContext.isOwner).toBe(true);
      expect(ownerDetail.streetAddress).toBe('123 Nguyen Van Huong');
      expect(ownerDetail.latitude).toBe(10.803);
      expect(ownerDetail.longitude).toBe(106.732);
      expect(ownerDetail.owner.fullName).toBe('Owner User');
      expect(ownerDetail.owner.email).toBe('owner@example.com');
      expect(ownerDetail.owner.phone).toBe('0901111111');
      expect((ownerDetail.owner as any).passwordHash).toBeUndefined();

      const adminDetail = await mlsService.getSharedListingDetail('lst_approved', {
        id: 'usr_admin',
        role: Role.ADMIN,
      });
      expect(adminDetail.accessContext.role).toBe(Role.ADMIN);
      expect(adminDetail.streetAddress).toBe('123 Nguyen Van Huong');
      expect(adminDetail.owner.email).toBe('owner@example.com');
      expect(adminDetail.owner.phone).toBe('0901111111');
      expect((adminDetail.owner as any).passwordHash).toBeUndefined();
    });

    it('AGENT owning listing X and receiving share on listing Y can access both with correct allowlists', async () => {
      // 1. usr_agent_1 owns lst_agent_owned
      const ownedDetail = await mlsService.getSharedListingDetail('lst_agent_owned', {
        id: 'usr_agent_1',
        role: Role.AGENT,
      });
      expect(ownedDetail.accessContext.isOwner).toBe(true);
      expect(ownedDetail.streetAddress).toBe('10 Dong Khoi');
      expect(ownedDetail.owner.email).toBe('agent1@example.com');
      expect(ownedDetail.owner.phone).toBe('0902222222');

      // 2. usr_agent_1 receives VIEW share on lst_approved from usr_owner
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1', permission: MlsSharePermission.VIEW },
      );
      const receivedDetail = await mlsService.getSharedListingDetail('lst_approved', {
        id: 'usr_agent_1',
        role: Role.AGENT,
      });
      expect(receivedDetail.accessContext.isOwner).toBe(false);
      expect(receivedDetail.accessContext.permission).toBe(MlsSharePermission.VIEW);
      expect(receivedDetail.streetAddress).toBeUndefined();
      expect(receivedDetail.owner.email).toBeUndefined();
    });

    it('denies access to an AGENT without an active share with 403 ForbiddenException', async () => {
      await expect(
        mlsService.getSharedListingDetail('lst_approved', {
          id: 'usr_agent_2',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies access once share is revoked with 403 ForbiddenException', async () => {
      const share = await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      await mlsService.revokeShare(share.id, { id: 'usr_owner', role: Role.OWNER });

      await expect(
        mlsService.getSharedListingDetail('lst_approved', {
          id: 'usr_agent_1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies access when listing is no longer APPROVED with 403 ForbiddenException', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      // Status changes to ARCHIVED
      listingsStore.get('lst_approved').status = ListingStatus.ARCHIVED;

      await expect(
        mlsService.getSharedListingDetail('lst_approved', {
          id: 'usr_agent_1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies access when listing owner account is deactivated with 403 ForbiddenException', async () => {
      await mlsService.grantShare(
        { id: 'usr_owner', role: Role.OWNER },
        { listingId: 'lst_approved', recipientId: 'usr_agent_1' },
      );

      // Owner deactivated
      usersStore.get('usr_owner').isActive = false;

      await expect(
        mlsService.getSharedListingDetail('lst_approved', {
          id: 'usr_agent_1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies access to non-AGENT users (e.g. BUYER) with 403 ForbiddenException', async () => {
      await expect(
        mlsService.getSharedListingDetail('lst_approved', {
          id: 'usr_buyer',
          role: Role.BUYER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
