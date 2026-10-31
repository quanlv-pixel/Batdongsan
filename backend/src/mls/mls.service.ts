import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GrantMlsShareDto } from './dto/grant-mls-share.dto.js';
import { RevokeMlsShareDto } from './dto/revoke-mls-share.dto.js';
import { QueryReceivedMlsSharesDto } from './dto/query-received-mls-shares.dto.js';
import { QueryMlsShareHistoryDto } from './dto/query-mls-share-history.dto.js';
import {
  ListingStatus,
  MlsSharePermission,
  Role,
} from '../generated/prisma/enums.js';

@Injectable()
export class MlsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format listing with string priceVnd for JSON serialization
   */
  private formatListing<T extends { priceVnd: bigint }>(listing: T) {
    return {
      ...listing,
      priceVnd: listing.priceVnd.toString(),
    };
  }

  /**
   * Grant MLS access on an APPROVED listing to an active AGENT recipient.
   * Only the listing owner can grant access. Recipients cannot re-share.
   * Self-sharing and inactive/non-agent recipients are rejected.
   */
  async grantShare(
    caller: { id: string; role: Role },
    dto: GrantMlsShareDto,
  ) {
    // 1. Disallow self-sharing
    if (caller.id === dto.recipientId) {
      throw new BadRequestException('Cannot share a listing with yourself');
    }

    // 2. Validate expiresAt if provided
    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('expiresAt must be a valid future timestamp');
      }
    }

    // 3. Validate listing exists, is owned by caller, and is APPROVED
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, ownerId: true, status: true, title: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.ownerId !== caller.id) {
      throw new ForbiddenException('Only the listing owner can grant MLS access');
    }

    if (listing.status !== ListingStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED listings can be shared in MLS');
    }

    // 4. Validate recipient user exists, is active, and has AGENT role
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true, role: true, isActive: true, fullName: true, email: true },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    if (!recipient.isActive) {
      throw new BadRequestException('Recipient user account is inactive');
    }

    if (recipient.role !== Role.AGENT) {
      throw new BadRequestException('MLS shares can only be granted to active users with AGENT role');
    }

    // 5. Check if an active, unexpired grant already exists for this (listingId, recipientId)
    const now = new Date();
    const existingActiveShare = await this.prisma.mlsShare.findFirst({
      where: {
        listingId: dto.listingId,
        receivedById: dto.recipientId,
        isActive: true,
      },
      select: { id: true, expiresAt: true },
    });

    if (existingActiveShare) {
      const isStillValid = !existingActiveShare.expiresAt || existingActiveShare.expiresAt > now;
      if (isStillValid) {
        throw new ConflictException(
          'An active MLS share already exists for this listing and recipient',
        );
      }
    }

    // 6. Atomically create share and audit log in transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Double-check active share inside transaction for concurrency safety
        const concurrentActive = await tx.mlsShare.findFirst({
          where: {
            listingId: dto.listingId,
            receivedById: dto.recipientId,
            isActive: true,
          },
          select: { id: true, expiresAt: true },
        });

        if (concurrentActive) {
          const isStillValid = !concurrentActive.expiresAt || concurrentActive.expiresAt > now;
          if (isStillValid) {
            throw new ConflictException(
              'An active MLS share already exists for this listing and recipient',
            );
          }

          // The existing grant is expired-but-isActive:
          // Atomically retire the expired grant to:
          // 1) Clear the PostgreSQL partial unique index (WHERE isActive = true)
          // 2) Preserve full history without deleting any records
          const expiredTime = concurrentActive.expiresAt ?? now;
          await tx.mlsShare.updateMany({
            where: {
              id: concurrentActive.id,
              isActive: true,
            },
            data: {
              isActive: false,
              revokedAt: expiredTime,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: caller.id,
              action: 'mls.expire',
              entityType: 'MlsShare',
              entityId: concurrentActive.id,
              meta: {
                listingId: dto.listingId,
                recipientId: dto.recipientId,
                supersededByGrant: true,
                expiredAt: concurrentActive.expiresAt?.toISOString() ?? now.toISOString(),
              },
            },
          });
        }

        const share = await tx.mlsShare.create({
          data: {
            listingId: dto.listingId,
            grantedById: caller.id,
            receivedById: dto.recipientId,
            permission: dto.permission ?? MlsSharePermission.VIEW,
            expiresAt,
            isActive: true,
          },
          include: {
            listing: {
              select: { id: true, title: true, status: true },
            },
            grantedBy: {
              select: { id: true, fullName: true, email: true },
            },
            receivedBy: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        });

        // Write immutable audit trail (BR-08)
        await tx.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'mls.grant',
            entityType: 'MlsShare',
            entityId: share.id,
            meta: {
              listingId: dto.listingId,
              grantedById: caller.id,
              receivedById: dto.recipientId,
              permission: share.permission,
              expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
            },
          },
        });

        return share;
      });
    } catch (error: any) {
      // Catch PostgreSQL partial unique constraint violation (code P2002)
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'An active MLS share already exists for this listing and recipient',
        );
      }
      throw error;
    }
  }

  /**
   * Revoke an active MLS share.
   * Allowed for the listing owner or ADMIN (for oversight).
   * Preserves share record and updates isActive = false, revokedAt = now.
   * Subsequent access with this share is immediately denied.
   */
  async revokeShare(
    shareId: string,
    caller: { id: string; role: Role },
    dto?: RevokeMlsShareDto,
  ) {
    const share = await this.prisma.mlsShare.findUnique({
      where: { id: shareId },
      include: {
        listing: {
          select: { id: true, ownerId: true, status: true },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('MLS share not found');
    }

    const isOwner = share.listing.ownerId === caller.id || share.grantedById === caller.id;
    const isAdmin = caller.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the listing owner or an ADMIN can revoke an MLS share');
    }

    if (!share.isActive) {
      throw new BadRequestException('MLS share is already revoked or inactive');
    }

    // Atomic conditional update and audit logging
    return this.prisma.$transaction(async (tx) => {
      const revokedAt = new Date();
      const updateResult = await tx.mlsShare.updateMany({
        where: {
          id: shareId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('MLS share was modified concurrently or already revoked');
      }

      await tx.auditLog.create({
        data: {
          actorId: caller.id,
          action: 'mls.revoke',
          entityType: 'MlsShare',
          entityId: shareId,
          meta: {
            listingId: share.listingId,
            revokedById: caller.id,
            reason: dto?.reason?.trim() ?? null,
            revokedAt: revokedAt.toISOString(),
          },
        },
      });

      return {
        id: share.id,
        listingId: share.listingId,
        receivedById: share.receivedById,
        isActive: false,
        revokedAt,
        message: 'MLS share revoked successfully',
      };
    });
  }

  /**
   * Get active shares received by the authenticated AGENT.
   * Only returns active, non-expired shares for APPROVED listings with active owners.
   * Supports bounded pagination and optional filtering.
   */
  async getReceivedShares(
    agentId: string,
    query: QueryReceivedMlsSharesDto,
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: any = {
      receivedById: agentId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
      listing: {
        status: ListingStatus.APPROVED,
        owner: {
          isActive: true,
        },
      },
    };

    if (query.province) {
      where.listing.province = { contains: query.province.trim(), mode: 'insensitive' };
    }
    if (query.district) {
      where.listing.district = { contains: query.district.trim(), mode: 'insensitive' };
    }
    if (query.propertyType) {
      where.listing.propertyType = query.propertyType;
    }
    if (query.transactionType) {
      where.listing.transactionType = query.transactionType;
    }

    const [total, items] = await Promise.all([
      this.prisma.mlsShare.count({ where }),
      this.prisma.mlsShare.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          permission: true,
          expiresAt: true,
          createdAt: true,
          listing: {
            select: {
              id: true,
              title: true,
              description: true,
              propertyType: true,
              transactionType: true,
              priceVnd: true,
              rentalPeriod: true,
              areaSqm: true,
              province: true,
              district: true,
              ward: true,
              streetAddress: true,
              latitude: true,
              longitude: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              images: {
                select: { id: true, url: true, order: true },
                orderBy: { order: 'asc' },
              },
              owner: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => {
        const baseListing = this.formatListing(item.listing);
        const isManage = item.permission === MlsSharePermission.MANAGE;
        const listingData: any = {
          id: baseListing.id,
          title: baseListing.title,
          description: baseListing.description,
          propertyType: baseListing.propertyType,
          transactionType: baseListing.transactionType,
          priceVnd: baseListing.priceVnd,
          rentalPeriod: baseListing.rentalPeriod,
          areaSqm: baseListing.areaSqm,
          province: baseListing.province,
          district: baseListing.district,
          ward: baseListing.ward,
          status: baseListing.status,
          createdAt: baseListing.createdAt,
          updatedAt: baseListing.updatedAt,
          images: baseListing.images,
          owner: {
            id: baseListing.owner.id,
            fullName: baseListing.owner.fullName,
          },
        };

        // MANAGE permission allows streetAddress and coordinates; VIEW omits them
        if (isManage) {
          listingData.streetAddress = baseListing.streetAddress;
          listingData.latitude = baseListing.latitude;
          listingData.longitude = baseListing.longitude;
        }

        return {
          id: item.id,
          permission: item.permission,
          expiresAt: item.expiresAt,
          createdAt: item.createdAt,
          listing: listingData,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get share history for a specific listing.
   * Only listing owner or ADMIN can inspect share history.
   * Includes both active and revoked historical grants.
   */
  async getListingShareHistory(
    listingId: string,
    caller: { id: string; role: Role },
    query: QueryMlsShareHistoryDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (caller.role !== Role.ADMIN && listing.ownerId !== caller.id) {
      throw new ForbiddenException('Only the listing owner or an ADMIN can view MLS share history');
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { listingId };
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, items] = await Promise.all([
      this.prisma.mlsShare.count({ where }),
      this.prisma.mlsShare.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          permission: true,
          isActive: true,
          revokedAt: true,
          expiresAt: true,
          createdAt: true,
          grantedBy: {
            select: { id: true, fullName: true, email: true },
          },
          receivedBy: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get internal shared-listing details.
   *
   * Stakeholder-Approved MVP Privacy Policy:
   * 1. Listing owner (based on listing.ownerId, independent of role) and ADMIN:
   *    - Authorized full details: streetAddress, latitude, longitude, and owner contact (fullName, email, phone).
   *    - Never exposes passwordHash or moderationLogs.
   * 2. AGENT recipient with VIEW permission:
   *    - Allowed: permitted listing info and province/district/ward location.
   *    - Strictly OMITTED: streetAddress, exact coordinates (latitude, longitude), and owner email/phone.
   *    - Owner object only includes { id, fullName }.
   * 3. AGENT recipient with MANAGE permission:
   *    - Allowed: same as VIEW plus streetAddress and exact coordinates.
   *    - Strictly OMITTED: owner email/phone.
   *    - Editing/moderation/re-sharing capabilities are deferred.
   */
  async getSharedListingDetail(
    listingId: string,
    caller: { id: string; role: Role },
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: 'asc' },
        },
        owner: {
          select: { id: true, fullName: true, email: true, phone: true, isActive: true },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Only APPROVED listings may be accessed through MLS
    if (listing.status !== ListingStatus.APPROVED) {
      throw new ForbiddenException('Only APPROVED listings can be accessed through MLS');
    }

    // Owner eligibility: owner must be active
    if (!listing.owner.isActive) {
      throw new ForbiddenException('Listing owner account is inactive');
    }

    const isOwner = caller.id === listing.ownerId;
    const isAdmin = caller.role === Role.ADMIN;
    const isOwnerOrAdmin = isOwner || isAdmin;

    let permission: MlsSharePermission | 'OWNER_OR_ADMIN' = 'OWNER_OR_ADMIN';
    let shareMeta: { shareId: string; expiresAt: Date | null } | null = null;

    if (!isOwnerOrAdmin) {
      if (caller.role !== Role.AGENT) {
        throw new ForbiddenException('You do not have active MLS access to this listing');
      }

      const now = new Date();
      const activeShare = await this.prisma.mlsShare.findFirst({
        where: {
          listingId,
          receivedById: caller.id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        select: {
          id: true,
          permission: true,
          expiresAt: true,
        },
      });

      if (!activeShare) {
        throw new ForbiddenException('You do not have active MLS access to this listing');
      }

      permission = activeShare.permission;
      shareMeta = {
        shareId: activeShare.id,
        expiresAt: activeShare.expiresAt,
      };
    }

    const isManage = permission === MlsSharePermission.MANAGE;

    // Caller-specific explicit response allowlist
    const response: any = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      priceVnd: listing.priceVnd.toString(),
      rentalPeriod: listing.rentalPeriod,
      areaSqm: listing.areaSqm,
      province: listing.province,
      district: listing.district,
      ward: listing.ward,
      status: listing.status,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      images: listing.images,
      owner: isOwnerOrAdmin
        ? {
            id: listing.owner.id,
            fullName: listing.owner.fullName,
            email: listing.owner.email,
            phone: listing.owner.phone,
          }
        : {
            id: listing.owner.id,
            fullName: listing.owner.fullName,
          },
      accessContext: {
        role: caller.role,
        isOwner,
        permission,
        ...(shareMeta && { share: shareMeta }),
      },
    };

    // Include streetAddress and exact coordinates only for Owner, ADMIN, or MANAGE recipient
    // Omit entirely for VIEW recipients
    if (isOwnerOrAdmin || isManage) {
      response.streetAddress = listing.streetAddress;
      response.latitude = listing.latitude;
      response.longitude = listing.longitude;
    }

    return response;
  }
}
