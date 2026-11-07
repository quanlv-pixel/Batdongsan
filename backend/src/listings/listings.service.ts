import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { QueryListingsDto } from './dto/query-listings.dto.js';
import { QueryMyListingsDto } from './dto/query-my-listings.dto.js';
import { ModerateListingDto } from './dto/moderate-listing.dto.js';
import {
  ListingStatus,
  RentalPeriod,
  Role,
  TransactionType,
} from '../generated/prisma/enums.js';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format listing for output (converts BigInt priceVnd to string for JSON serialization)
   */
  private formatListing<T extends { priceVnd: bigint }>(listing: T) {
    return {
      ...listing,
      priceVnd: listing.priceVnd.toString(),
    };
  }

  /**
   * POST /api/listings
   * OWNER or AGENT only; ownerId comes strictly from authenticated identity; status starts as DRAFT.
   */
  async createListing(ownerId: string, dto: CreateListingDto) {
    // Validate transactionType & rentalPeriod consistency
    if (dto.transactionType === TransactionType.FOR_SALE) {
      if (dto.rentalPeriod !== undefined && dto.rentalPeriod !== null) {
        throw new BadRequestException('FOR_SALE listings cannot have a rentalPeriod');
      }
    } else if (dto.transactionType === TransactionType.FOR_RENT) {
      if (!dto.rentalPeriod) {
        throw new BadRequestException(
          'FOR_RENT listings require a valid rentalPeriod (MONTH, QUARTER, YEAR)',
        );
      }
    }

    const priceVnd = BigInt(dto.priceVnd);
    if (priceVnd <= 0n) {
      throw new BadRequestException('priceVnd must be greater than 0');
    }

    if (dto.areaSqm <= 0) {
      throw new BadRequestException('areaSqm must be greater than 0');
    }

    const listing = await this.prisma.listing.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        propertyType: dto.propertyType,
        transactionType: dto.transactionType,
        priceVnd,
        rentalPeriod:
          dto.transactionType === TransactionType.FOR_SALE ? null : dto.rentalPeriod,
        areaSqm: dto.areaSqm,
        province: dto.province.trim(),
        district: dto.district.trim(),
        ward: dto.ward?.trim() ?? null,
        streetAddress: dto.streetAddress?.trim() ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        status: ListingStatus.DRAFT, // strictly starts as DRAFT
        ownerId, // strictly from authenticated token
      },
    });

    return this.formatListing(listing);
  }

  /**
   * PATCH /api/listings/:id
   * Listing owner or ADMIN; only DRAFT/REJECTED listings are editable.
   */
  async updateListing(
    id: string,
    user: { id: string; role: Role },
    dto: UpdateListingDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Listing not found');
      }

      const isOwner = existing.ownerId === user.id;
      const isAdmin = user.role === Role.ADMIN;
      if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You do not have permission to edit this listing');
      }

      // Only DRAFT or REJECTED listings can be edited
      if (
        existing.status !== ListingStatus.DRAFT &&
        existing.status !== ListingStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Only DRAFT or REJECTED listings can be edited. Current status is ${existing.status}`,
        );
      }

      // Validate resulting listing state after partial update
      const effectiveTxType = dto.transactionType ?? existing.transactionType;

      let effectiveRentalPeriod: RentalPeriod | null = existing.rentalPeriod;
      if (dto.rentalPeriod !== undefined) {
        effectiveRentalPeriod = dto.rentalPeriod;
      } else if (dto.transactionType === TransactionType.FOR_SALE) {
        // Switching to FOR_SALE automatically clears rentalPeriod unless explicitly supplied
        effectiveRentalPeriod = null;
      }

      if (effectiveTxType === TransactionType.FOR_SALE) {
        if (effectiveRentalPeriod !== null && effectiveRentalPeriod !== undefined) {
          throw new BadRequestException('FOR_SALE listings cannot have a rentalPeriod');
        }
      } else if (effectiveTxType === TransactionType.FOR_RENT) {
        if (!effectiveRentalPeriod) {
          throw new BadRequestException('FOR_RENT listings require a valid rentalPeriod');
        }
      }

      let priceVnd: bigint | undefined = undefined;
      if (dto.priceVnd !== undefined) {
        priceVnd = BigInt(dto.priceVnd);
        if (priceVnd <= 0n) {
          throw new BadRequestException('priceVnd must be greater than 0');
        }
      }

      if (dto.areaSqm !== undefined && dto.areaSqm <= 0) {
        throw new BadRequestException('areaSqm must be greater than 0');
      }

      // ATOMIC WRITE-TIME ENFORCEMENT:
      // Condition includes id, status (must still be DRAFT or REJECTED),
      // and if user is not ADMIN, ownerId must still match.
      // An edit racing with submission will find 0 matching rows and be rejected with 409 Conflict.
      const whereCondition: any = {
        id,
        status: { in: [ListingStatus.DRAFT, ListingStatus.REJECTED] },
      };
      if (!isAdmin) {
        whereCondition.ownerId = user.id;
      }

      const updateResult = await tx.listing.updateMany({
        where: whereCondition,
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
          ...(dto.propertyType !== undefined && { propertyType: dto.propertyType }),
          ...(dto.transactionType !== undefined && { transactionType: dto.transactionType }),
          ...(priceVnd !== undefined && { priceVnd }),
          ...(dto.areaSqm !== undefined && { areaSqm: dto.areaSqm }),
          rentalPeriod:
            effectiveTxType === TransactionType.FOR_SALE ? null : effectiveRentalPeriod,
          ...(dto.province !== undefined && { province: dto.province.trim() }),
          ...(dto.district !== undefined && { district: dto.district.trim() }),
          ...(dto.ward !== undefined && { ward: dto.ward ? dto.ward.trim() : null }),
          ...(dto.streetAddress !== undefined && {
            streetAddress: dto.streetAddress ? dto.streetAddress.trim() : null,
          }),
          ...(dto.latitude !== undefined && { latitude: dto.latitude }),
          ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Listing status or ownership was modified concurrently and is no longer editable',
        );
      }

      const updated = await tx.listing.findUnique({
        where: { id },
      });

      return this.formatListing(updated!);
    });
  }

  /**
   * POST /api/listings/:id/submit
   * Listing owner only; DRAFT or REJECTED -> PENDING.
   * Concurrency-safe conditional update.
   */
  async submitListing(id: string, userId: string) {
    const existing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('Listing not found');
    }

    if (existing.ownerId !== userId) {
      throw new ForbiddenException('Only the listing owner can submit this listing');
    }

    if (
      existing.status !== ListingStatus.DRAFT &&
      existing.status !== ListingStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Listing can only be submitted from DRAFT or REJECTED status. Current status is ${existing.status}`,
      );
    }

    // Atomic conditional update to prevent race conditions
    const result = await this.prisma.listing.updateMany({
      where: {
        id,
        ownerId: userId,
        status: { in: [ListingStatus.DRAFT, ListingStatus.REJECTED] },
      },
      data: {
        status: ListingStatus.PENDING,
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Listing status was modified concurrently or is no longer eligible for submission',
      );
    }

    return {
      id,
      status: ListingStatus.PENDING,
      message: 'Listing submitted successfully for moderation',
    };
  }

  /**
   * GET /api/listings
   * Public APPROVED listings only; bounded pagination; filtered; strict allowlist excluding private fields.
   */
  async getPublicListings(query: QueryListingsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      status: ListingStatus.APPROVED, // strictly APPROVED
    };

    if (query.province) {
      where.province = { contains: query.province.trim(), mode: 'insensitive' };
    }
    if (query.district) {
      where.district = { contains: query.district.trim(), mode: 'insensitive' };
    }
    if (query.ward) {
      where.ward = { contains: query.ward.trim(), mode: 'insensitive' };
    }
    if (query.propertyType) {
      where.propertyType = query.propertyType;
    }
    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query.minPrice || query.maxPrice) {
      where.priceVnd = {};
      if (query.minPrice) {
        where.priceVnd.gte = BigInt(query.minPrice);
      }
      if (query.maxPrice) {
        where.priceVnd.lte = BigInt(query.maxPrice);
      }
    }

    if (query.minArea !== undefined || query.maxArea !== undefined) {
      where.areaSqm = {};
      if (query.minArea !== undefined) {
        where.areaSqm.gte = query.minArea;
      }
      if (query.maxArea !== undefined) {
        where.areaSqm.lte = query.maxArea;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Strict allowlist: NEVER select streetAddress, latitude, longitude, owner phone/email/passwordHash
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
          status: true,
          createdAt: true,
          updatedAt: true,
          images: {
            select: { id: true, url: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => this.formatListing(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /api/listings/mine
   * Authenticated user's listings across all statuses.
   */
  async getMyListings(userId: string, query: QueryMyListingsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ownerId: userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
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
          moderationLogs: {
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              reason: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => this.formatListing(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /api/listings/:id
   * Public APPROVED detail only; return 404 for all non-APPROVED records.
   * Never exposes streetAddress, exact coordinates, private contact info.
   */
  async getPublicListingDetail(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id,
        status: ListingStatus.APPROVED, // strictly APPROVED
      },
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
        status: true,
        createdAt: true,
        updatedAt: true,
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!listing) {
      // Returns 404 for non-existent records AND non-APPROVED records
      throw new NotFoundException('Listing not found');
    }

    return this.formatListing(listing);
  }

  /**
   * POST /api/listings/:id/moderate
   * ADMIN only; PENDING -> APPROVED or REJECTED.
   * Rejection requires non-whitespace reason.
   * Atomically updates status and writes ModerationLog using transactional conditional update.
   */
  async moderateListing(
    id: string,
    moderatorId: string,
    dto: ModerateListingDto,
  ) {
    if (dto.status === ListingStatus.REJECTED) {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Rejection requires a non-empty reason');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException('Listing not found');
      }

      if (existing.status !== ListingStatus.PENDING) {
        throw new BadRequestException(
          `Only PENDING listings can be moderated. Current status is ${existing.status}`,
        );
      }

      const updateResult = await tx.listing.updateMany({
        where: {
          id,
          status: ListingStatus.PENDING,
        },
        data: {
          status: dto.status,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Listing status was modified concurrently by another request',
        );
      }

      const moderationLog = await tx.moderationLog.create({
        data: {
          listingId: id,
          moderatorId,
          fromStatus: existing.status, // actual previous status
          toStatus: dto.status,
          reason: dto.status === ListingStatus.REJECTED ? dto.reason!.trim() : (dto.reason?.trim() ?? null),
        },
      });

      return {
        id,
        status: dto.status,
        moderationLog: {
          id: moderationLog.id,
          fromStatus: moderationLog.fromStatus,
          toStatus: moderationLog.toStatus,
          reason: moderationLog.reason,
          createdAt: moderationLog.createdAt,
        },
      };
    });
  }

  /**
   * GET /api/listings/:id/moderation-history
   * ADMIN only. Returns moderation history for a listing.
   */
  async getModerationHistory(id: string) {
    const existing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.moderationLog.findMany({
      where: { listingId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        listingId: true,
        fromStatus: true,
        toStatus: true,
        reason: true,
        createdAt: true,
        moderator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
