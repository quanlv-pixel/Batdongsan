import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactRequestDto } from './dto/create-contact-request.dto.js';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto.js';
import { AssignAgentDto } from './dto/assign-agent.dto.js';
import { ReassignAgentDto } from './dto/reassign-agent.dto.js';
import { ReopenContactRequestDto } from './dto/reopen-contact-request.dto.js';
import { QueryContactRequestsDto } from './dto/query-contact-requests.dto.js';
import {
  ContactRequestStatus,
  ListingStatus,
  Role,
} from '../generated/prisma/enums.js';

/**
 * Helper to identify active assignment unique constraint violations from PostgreSQL
 * Constraint: request_assignments_contactRequestId_key WHERE (isActive = true)
 * Supports Prisma standard engine (meta.target) and Prisma 7 adapter-pg (cause.constraint.index)
 */
function isAssignmentUniqueConflict(err: any): boolean {
  const isP2002 = err?.code === 'P2002' || err?.cause?.originalCode === '23505';
  if (!isP2002) return false;

  // 1. Check meta.target (Prisma standard engine)
  const target = err?.meta?.target;
  if (target) {
    if (Array.isArray(target)) {
      if (
        target.some(
          (t) =>
            t === 'request_assignments_contactRequestId_key' ||
            t === 'contactRequestId' ||
            (typeof t === 'string' && t.includes('contactRequestId')),
        )
      ) {
        return true;
      }
    } else if (typeof target === 'string') {
      if (
        target === 'request_assignments_contactRequestId_key' ||
        target.includes('contactRequestId')
      ) {
        return true;
      }
    }
  }

  // 2. Check err.cause?.constraint?.index (Prisma 7 with @prisma/adapter-pg)
  const index = err?.cause?.constraint?.index;
  if (index === 'request_assignments_contactRequestId_key') {
    return true;
  }

  // 3. Check err.cause?.originalMessage or err.message
  const originalMsg = err?.cause?.originalMessage;
  if (
    typeof originalMsg === 'string' &&
    originalMsg.includes('request_assignments_contactRequestId_key')
  ) {
    return true;
  }

  const msg = err?.message;
  if (typeof msg === 'string' && msg.includes('request_assignments_contactRequestId_key')) {
    return true;
  }

  return false;
}

@Injectable()
export class ContactRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reusable deterministic Agent selection algorithm
   * Priority 1: Listing owner if active AGENT
   * Priority 2: Active AGENT with lowest active workload (tie-break: createdAt asc, id asc)
   * Fallback: null if no eligible agent exists
   */
  async selectCandidateAgent(
    tx: any,
    listing: {
      ownerId: string;
      owner?: { id: string; role: Role; isActive: boolean } | null;
    },
  ): Promise<string | null> {
    // Priority 1 — Listing-owner Agent
    if (
      listing.owner &&
      listing.owner.role === Role.AGENT &&
      listing.owner.isActive === true
    ) {
      return listing.owner.id;
    }

    // Priority 2 — Lowest active workload among active AGENTs
    const activeAgents = await tx.user.findMany({
      where: {
        role: Role.AGENT,
        isActive: true,
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if (activeAgents.length === 0) {
      return null;
    }

    const activeCounts = await tx.requestAssignment.groupBy({
      by: ['agentId'],
      where: {
        isActive: true,
        agentId: { in: activeAgents.map((a: { id: string }) => a.id) },
      },
      _count: {
        id: true,
      },
    });

    const countMap = new Map<string, number>();
    for (const c of activeCounts) {
      countMap.set(c.agentId, c._count.id);
    }

    const sorted = [...activeAgents].sort((a, b) => {
      const countA = countMap.get(a.id) ?? 0;
      const countB = countMap.get(b.id) ?? 0;
      if (countA !== countB) return countA - countB;
      const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    return sorted[0].id;
  }

  /**
   * Helper to format listing with string priceVnd
   */
  private formatListing(listing: any) {
    if (!listing) return null;
    return {
      id: listing.id,
      title: listing.title,
      priceVnd: listing.priceVnd ? listing.priceVnd.toString() : '0',
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      province: listing.province,
      district: listing.district,
      ward: listing.ward,
      status: listing.status,
      images: listing.images ?? [],
    };
  }

  /**
   * 1. Create a new Contact Request
   * Allowed roles: BUYER, OWNER, AGENT (ADMIN rejected with 403)
   * Requires: APPROVED listing, listing.ownerId !== caller.id, contactConsent === true
   * Business-critical checks & automatic assignment performed inside transaction
   */
  async createRequest(
    caller: { id: string; role: Role },
    dto: CreateContactRequestDto,
  ) {
    if (caller.role === Role.ADMIN) {
      throw new ForbiddenException('Administrators cannot create contact requests');
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: dto.listingId },
        include: {
          owner: {
            select: { id: true, role: true, isActive: true },
          },
        },
      });

      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      if (listing.ownerId === caller.id) {
        throw new BadRequestException('Cannot create a contact request for your own listing');
      }

      if (listing.status !== ListingStatus.APPROVED) {
        throw new BadRequestException('Contact requests can only be submitted for APPROVED listings');
      }

      // Run deterministic automatic assignment policy
      const selectedAgentId = await this.selectCandidateAgent(tx, listing);
      const initialStatus = selectedAgentId
        ? ContactRequestStatus.IN_PROGRESS
        : ContactRequestStatus.NEW;

      const request = await tx.contactRequest.create({
        data: {
          listingId: dto.listingId,
          buyerId: caller.id,
          message: dto.message?.trim() || null,
          contactConsent: dto.contactConsent,
          status: initialStatus,
        },
      });

      if (selectedAgentId) {
        const assignment = await tx.requestAssignment.create({
          data: {
            contactRequestId: request.id,
            agentId: selectedAgentId,
            isActive: true,
            assignedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'request.assign',
            entityType: 'RequestAssignment',
            entityId: assignment.id,
            meta: {
              contactRequestId: request.id,
              agentId: selectedAgentId,
              isAutoAssigned: true,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: caller.id,
          action: 'request.create',
          entityType: 'ContactRequest',
          entityId: request.id,
          meta: {
            listingId: dto.listingId,
            buyerId: caller.id,
            contactConsent: dto.contactConsent,
            initialStatus,
            assignedAgentId: selectedAgentId ?? null,
          },
        },
      });

      return {
        id: request.id,
        listingId: request.listingId,
        buyerId: request.buyerId,
        message: request.message,
        contactConsent: request.contactConsent,
        status: request.status,
        createdAt: request.createdAt,
        assignedAgentId: selectedAgentId ?? null,
      };
    });
  }

  /**
   * 2. Buyer views own requests
   */
  async getMyRequests(buyerId: string, query: QueryContactRequestsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { buyerId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.contactRequest.count({ where }),
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              priceVnd: true,
              propertyType: true,
              transactionType: true,
              province: true,
              district: true,
              ward: true,
              status: true,
              images: {
                select: { id: true, url: true, order: true },
                orderBy: { order: 'asc' },
              },
            },
          },
          assignments: {
            where: { isActive: true },
            select: {
              id: true,
              isActive: true,
              assignedAt: true,
              agent: {
                select: { id: true, fullName: true, avatarUrl: true, phone: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => {
        const activeAssign = item.assignments.find((a) => a.isActive);
        return {
          id: item.id,
          listingId: item.listingId,
          message: item.message,
          contactConsent: item.contactConsent,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          listing: this.formatListing(item.listing),
          assignedAgent: activeAssign
            ? {
                id: activeAssign.agent.id,
                fullName: activeAssign.agent.fullName,
                avatarUrl: activeAssign.agent.avatarUrl,
                phone: activeAssign.agent.phone,
                assignedAt: activeAssign.assignedAt,
              }
            : null,
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
   * 3. Agent views active assigned requests
   * Applies buyer contact privacy allowlist
   */
  async getAssignedRequests(agentId: string, query: QueryContactRequestsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      assignments: {
        some: {
          agentId,
          isActive: true,
        },
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.contactRequest.count({ where }),
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              priceVnd: true,
              propertyType: true,
              transactionType: true,
              province: true,
              district: true,
              ward: true,
              status: true,
              images: {
                select: { id: true, url: true, order: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => {
        const buyerData: any = {
          id: item.buyer.id,
          fullName: item.buyer.fullName,
        };

        // Privacy allowlist: only disclose email/phone when contactConsent === true
        if (item.contactConsent) {
          buyerData.email = item.buyer.email;
          buyerData.phone = item.buyer.phone;
        }

        return {
          id: item.id,
          listingId: item.listingId,
          message: item.message,
          contactConsent: item.contactConsent,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          buyer: buyerData,
          listing: this.formatListing(item.listing),
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
   * 4. Listing owner views requests for owned listings
   * Restricted metadata-only allowlist: no buyer identity, no message, no assignments
   */
  async getForOwnedListings(ownerId: string, query: QueryContactRequestsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      listing: {
        ownerId,
      },
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.listingId) {
      where.listingId = query.listingId;
    }

    const [total, items] = await Promise.all([
      this.prisma.contactRequest.count({ where }),
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              priceVnd: true,
              propertyType: true,
              transactionType: true,
              province: true,
              district: true,
              ward: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        listingId: item.listingId,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        listing: this.formatListing(item.listing),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 5. ADMIN request management & filtering
   * Rejects mutually exclusive filter: agentId combined with unassigned=true
   */
  async getAllRequests(query: QueryContactRequestsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    if (query.agentId && query.unassigned) {
      throw new BadRequestException('Cannot filter by both agentId and unassigned=true');
    }

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.listingId) {
      where.listingId = query.listingId;
    }
    if (query.agentId) {
      where.assignments = {
        some: {
          agentId: query.agentId,
          isActive: true,
        },
      };
    }
    if (query.unassigned) {
      where.assignments = {
        none: {
          isActive: true,
        },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.contactRequest.count({ where }),
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              priceVnd: true,
              propertyType: true,
              transactionType: true,
              province: true,
              district: true,
              ward: true,
              status: true,
              images: {
                select: { id: true, url: true, order: true },
                orderBy: { order: 'asc' },
              },
            },
          },
          assignments: {
            where: { isActive: true },
            select: {
              id: true,
              isActive: true,
              assignedAt: true,
              agent: {
                select: { id: true, fullName: true, email: true, phone: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => {
        const activeAssign = item.assignments.find((a) => a.isActive);
        return {
          id: item.id,
          listingId: item.listingId,
          buyerId: item.buyerId,
          message: item.message,
          contactConsent: item.contactConsent,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          buyer: {
            id: item.buyer.id,
            fullName: item.buyer.fullName,
            email: item.buyer.email,
            phone: item.buyer.phone,
          },
          listing: this.formatListing(item.listing),
          assignedAgent: activeAssign
            ? {
                id: activeAssign.agent.id,
                fullName: activeAssign.agent.fullName,
                email: activeAssign.agent.email,
                phone: activeAssign.agent.phone,
                assignedAt: activeAssign.assignedAt,
              }
            : null,
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
   * 6. Request Detail with Caller-Specific Privacy Allowlists
   */
  async getRequestDetail(
    id: string,
    caller: { id: string; role: Role },
  ) {
    const request = await this.prisma.contactRequest.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            priceVnd: true,
            propertyType: true,
            transactionType: true,
            province: true,
            district: true,
            ward: true,
            status: true,
            ownerId: true,
            images: {
              select: { id: true, url: true, order: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          select: {
            id: true,
            agentId: true,
            isActive: true,
            assignedAt: true,
            releasedAt: true,
            agent: {
              select: { id: true, fullName: true, avatarUrl: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Contact request not found');
    }

    const isBuyer = request.buyerId === caller.id;
    const isAdmin = caller.role === Role.ADMIN;
    const isListingOwner = request.listing.ownerId === caller.id;

    let isAssignedAgent = false;
    if (caller.role === Role.AGENT) {
      // Re-verify caller account activation in database
      const callerUser = await this.prisma.user.findUnique({
        where: { id: caller.id },
        select: { role: true, isActive: true },
      });
      if (callerUser?.role === Role.AGENT && callerUser.isActive === true) {
        isAssignedAgent = request.assignments.some(
          (a) => a.agentId === caller.id && a.isActive === true,
        );
      }
    }

    if (!isBuyer && !isAdmin && !isListingOwner && !isAssignedAgent) {
      throw new ForbiddenException('You are not authorized to view this contact request');
    }

    // 1. If listing owner only (not buyer, admin or assigned agent): restricted allowlist
    if (isListingOwner && !isBuyer && !isAdmin && !isAssignedAgent) {
      return {
        id: request.id,
        listingId: request.listingId,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        listing: this.formatListing(request.listing),
        accessContext: {
          role: caller.role,
          isListingOwner: true,
        },
      };
    }

    // 2. If buyer: sees own contact details, assigned agent summary (no email), message
    if (isBuyer) {
      const activeAssign = request.assignments.find((a) => a.isActive);
      return {
        id: request.id,
        listingId: request.listingId,
        buyerId: request.buyerId,
        message: request.message,
        contactConsent: request.contactConsent,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        buyer: {
          id: request.buyer.id,
          fullName: request.buyer.fullName,
          email: request.buyer.email,
          phone: request.buyer.phone,
        },
        listing: this.formatListing(request.listing),
        assignedAgent: activeAssign
          ? {
              id: activeAssign.agent.id,
              fullName: activeAssign.agent.fullName,
              avatarUrl: activeAssign.agent.avatarUrl,
              phone: activeAssign.agent.phone,
              assignedAt: activeAssign.assignedAt,
            }
          : null,
        accessContext: {
          role: caller.role,
          isBuyer: true,
        },
      };
    }

    // 3. If assigned agent: sees buyer details conditioned on contactConsent
    if (isAssignedAgent) {
      const buyerData: any = {
        id: request.buyer.id,
        fullName: request.buyer.fullName,
      };
      if (request.contactConsent) {
        buyerData.email = request.buyer.email;
        buyerData.phone = request.buyer.phone;
      }
      return {
        id: request.id,
        listingId: request.listingId,
        buyerId: request.buyerId,
        message: request.message,
        contactConsent: request.contactConsent,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        buyer: buyerData,
        listing: this.formatListing(request.listing),
        accessContext: {
          role: caller.role,
          isAssignedAgent: true,
        },
      };
    }

    // 4. Admin: sees complete details
    const activeAssign = request.assignments.find((a) => a.isActive);
    return {
      id: request.id,
      listingId: request.listingId,
      buyerId: request.buyerId,
      message: request.message,
      contactConsent: request.contactConsent,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      buyer: {
        id: request.buyer.id,
        fullName: request.buyer.fullName,
        email: request.buyer.email,
        phone: request.buyer.phone,
      },
      listing: this.formatListing(request.listing),
      assignedAgent: activeAssign
        ? {
            id: activeAssign.agent.id,
            fullName: activeAssign.agent.fullName,
            email: activeAssign.agent.email,
            phone: activeAssign.agent.phone,
            assignedAt: activeAssign.assignedAt,
          }
        : null,
      accessContext: {
        role: caller.role,
        isAdmin: true,
      },
    };
  }

  /**
   * 7. Update Request Status (Complete State Machine)
   * Permitted actors: currently assigned active AGENT or ADMIN
   * Revalidates status transition within transaction and uses conditional update
   */
  async updateStatus(
    id: string,
    caller: { id: string; role: Role },
    dto: UpdateRequestStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.contactRequest.findUnique({
        where: { id },
        include: {
          assignments: { where: { isActive: true } },
        },
      });

      if (!request) {
        throw new NotFoundException('Contact request not found');
      }

      const isAdmin = caller.role === Role.ADMIN;
      let isAssignedAgent = false;

      if (caller.role === Role.AGENT) {
        const callerUser = await tx.user.findUnique({
          where: { id: caller.id },
          select: { role: true, isActive: true },
        });
        if (callerUser?.role === Role.AGENT && callerUser.isActive === true) {
          isAssignedAgent = request.assignments.some(
            (a) => a.agentId === caller.id && a.isActive === true,
          );
        }
      }

      if (!isAdmin && !isAssignedAgent) {
        throw new ForbiddenException(
          'Only the currently assigned active agent or an administrator can update request status',
        );
      }

      // 1. Terminal states cannot be updated directly via status PATCH
      if (
        request.status === ContactRequestStatus.COMPLETED ||
        request.status === ContactRequestStatus.REJECTED
      ) {
        throw new BadRequestException(
          'Terminal contact requests cannot be updated directly. Use the reopen workflow.',
        );
      }

      // 2. Reject unchanged status
      if (request.status === dto.status) {
        throw new BadRequestException('Request is already in this status');
      }

      // 3. State transition matrix
      if (request.status === ContactRequestStatus.NEW) {
        if (dto.status === ContactRequestStatus.REJECTED) {
          if (!isAdmin) {
            throw new ForbiddenException('Only administrators can reject an unassigned request');
          }
        } else if (dto.status === ContactRequestStatus.IN_PROGRESS) {
          throw new BadRequestException(
            'Cannot transition from NEW to IN_PROGRESS via status update. Use the assignment workflow.',
          );
        } else {
          throw new BadRequestException(
            `Cannot transition directly from NEW to ${dto.status}`,
          );
        }
      } else if (request.status === ContactRequestStatus.IN_PROGRESS) {
        if (dto.status === ContactRequestStatus.NEW) {
          throw new BadRequestException('Cannot transition from IN_PROGRESS back to NEW');
        }
        if (
          dto.status !== ContactRequestStatus.COMPLETED &&
          dto.status !== ContactRequestStatus.REJECTED
        ) {
          throw new BadRequestException(
            `Cannot transition from IN_PROGRESS to ${dto.status}`,
          );
        }
        // Both active assigned AGENT and ADMIN can transition IN_PROGRESS to COMPLETED or REJECTED
      } else {
        throw new BadRequestException(
          `Invalid status transition from ${request.status} to ${dto.status}`,
        );
      }

      // Concurrency protection: conditional update on current status
      const updateResult = await tx.contactRequest.updateMany({
        where: {
          id,
          status: request.status,
        },
        data: {
          status: dto.status,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Request was modified concurrently. Please refresh and retry.');
      }

      const updated = await tx.contactRequest.findUniqueOrThrow({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          actorId: caller.id,
          action: 'request.status_change',
          entityType: 'ContactRequest',
          entityId: id,
          meta: {
            fromStatus: request.status,
            toStatus: dto.status,
            note: dto.note ?? null,
          },
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      };
    });
  }

  /**
   * 8. Admin first assignment
   * Allowed only when no active assignment exists
   * Atomic within transaction with precise constraint handling
   */
  async assignAgent(
    id: string,
    caller: { id: string; role: Role },
    dto: AssignAgentDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.contactRequest.findUnique({
          where: { id },
          include: {
            assignments: { where: { isActive: true } },
          },
        });

        if (!request) {
          throw new NotFoundException('Contact request not found');
        }

        if (
          request.status === ContactRequestStatus.COMPLETED ||
          request.status === ContactRequestStatus.REJECTED
        ) {
          throw new BadRequestException('Cannot assign a terminal contact request. Please reopen it first.');
        }

        if (request.assignments.length > 0) {
          throw new ConflictException('An active assignment already exists for this request. Use reassign instead.');
        }

        const targetUser = await tx.user.findUnique({
          where: { id: dto.agentId },
          select: { id: true, role: true, isActive: true },
        });

        if (!targetUser) {
          throw new NotFoundException('Target agent user not found');
        }

        if (targetUser.role !== Role.AGENT || !targetUser.isActive) {
          throw new BadRequestException('Target user is not an active agent');
        }

        const assignment = await tx.requestAssignment.create({
          data: {
            contactRequestId: id,
            agentId: dto.agentId,
            isActive: true,
            assignedAt: new Date(),
          },
        });

        const targetStatus =
          request.status === ContactRequestStatus.NEW
            ? ContactRequestStatus.IN_PROGRESS
            : request.status;

        const statusUpdate = await tx.contactRequest.updateMany({
          where: {
            id,
            status: request.status,
          },
          data: {
            status: targetStatus,
          },
        });

        if (statusUpdate.count !== 1) {
          throw new ConflictException(
            'Contact request was modified concurrently. Please reload and retry.',
          );
        }

        await tx.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'request.assign',
            entityType: 'RequestAssignment',
            entityId: assignment.id,
            meta: {
              contactRequestId: id,
              agentId: dto.agentId,
              reason: dto.reason ?? null,
            },
          },
        });

        return {
          id: assignment.id,
          contactRequestId: id,
          agentId: assignment.agentId,
          isActive: assignment.isActive,
          assignedAt: assignment.assignedAt,
          requestStatus: targetStatus,
        };
      });
    } catch (err: any) {
      if (isAssignmentUniqueConflict(err)) {
        throw new ConflictException('An active assignment already exists for this request. Use reassign instead.');
      }
      throw err;
    }
  }

  /**
   * 9. Admin reassignment
   * Requires an existing active assignment. Releases old and creates new atomically.
   */
  async reassignAgent(
    id: string,
    caller: { id: string; role: Role },
    dto: ReassignAgentDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.contactRequest.findUnique({
          where: { id },
          include: {
            assignments: { where: { isActive: true } },
          },
        });

        if (!request) {
          throw new NotFoundException('Contact request not found');
        }

        if (
          request.status === ContactRequestStatus.COMPLETED ||
          request.status === ContactRequestStatus.REJECTED
        ) {
          throw new BadRequestException('Cannot reassign a terminal contact request. Please reopen it first.');
        }

        const activeAssignment = request.assignments.find((a) => a.isActive);
        if (!activeAssignment) {
          throw new ConflictException('No active assignment exists for this request. Use assign instead.');
        }

        if (activeAssignment.agentId === dto.agentId) {
          throw new BadRequestException('Request is already actively assigned to this agent');
        }

        const targetUser = await tx.user.findUnique({
          where: { id: dto.agentId },
          select: { id: true, role: true, isActive: true },
        });

        if (!targetUser) {
          throw new NotFoundException('Target agent user not found');
        }

        if (targetUser.role !== Role.AGENT || !targetUser.isActive) {
          throw new BadRequestException('Target user is not an active agent');
        }

        const now = new Date();
        await tx.requestAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            isActive: false,
            releasedAt: now,
          },
        });

        const newAssignment = await tx.requestAssignment.create({
          data: {
            contactRequestId: id,
            agentId: dto.agentId,
            isActive: true,
            assignedAt: now,
          },
        });

        const statusUpdate = await tx.contactRequest.updateMany({
          where: {
            id,
            status: request.status,
          },
          data: {
            status: ContactRequestStatus.IN_PROGRESS,
          },
        });

        if (statusUpdate.count !== 1) {
          throw new ConflictException(
            'Contact request was modified concurrently. Please reload and retry.',
          );
        }

        await tx.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'request.reassign',
            entityType: 'RequestAssignment',
            entityId: newAssignment.id,
            meta: {
              contactRequestId: id,
              previousAgentId: activeAssignment.agentId,
              newAgentId: dto.agentId,
              reason: dto.reason ?? null,
            },
          },
        });

        return {
          id: newAssignment.id,
          contactRequestId: id,
          agentId: newAssignment.agentId,
          isActive: newAssignment.isActive,
          assignedAt: newAssignment.assignedAt,
          previousAgentId: activeAssignment.agentId,
          requestStatus: ContactRequestStatus.IN_PROGRESS,
        };
      });
    } catch (err: any) {
      if (isAssignmentUniqueConflict(err)) {
        throw new ConflictException('Concurrent assignment conflict. Please retry.');
      }
      throw err;
    }
  }

  /**
   * 10. Admin Reopen terminal request
   * Requires non-empty reason
   * Validates and executes all actions inside transaction
   */
  async reopenRequest(
    id: string,
    caller: { id: string; role: Role },
    dto: ReopenContactRequestDto,
  ) {
    const trimmedReason = dto.reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Reopen reason is mandatory');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.contactRequest.findUnique({
          where: { id },
          include: {
            assignments: {
              where: { isActive: true },
              include: { agent: true },
            },
            listing: {
              include: { owner: true },
            },
          },
        });

        if (!request) {
          throw new NotFoundException('Contact request not found');
        }

        if (
          request.status !== ContactRequestStatus.COMPLETED &&
          request.status !== ContactRequestStatus.REJECTED
        ) {
          throw new BadRequestException('Only terminal requests (COMPLETED or REJECTED) can be reopened');
        }

        let newStatus: ContactRequestStatus = ContactRequestStatus.IN_PROGRESS;
        let activeAgentId: string | null = null;

        const activeAssignment = request.assignments.find((a) => a.isActive);
        if (
          activeAssignment &&
          activeAssignment.agent.role === Role.AGENT &&
          activeAssignment.agent.isActive === true
        ) {
          activeAgentId = activeAssignment.agentId;
          newStatus = ContactRequestStatus.IN_PROGRESS;
        } else {
          if (activeAssignment) {
            await tx.requestAssignment.update({
              where: { id: activeAssignment.id },
              data: { isActive: false, releasedAt: new Date() },
            });
          }

          const selectedAgentId = await this.selectCandidateAgent(tx, request.listing);
          if (selectedAgentId) {
            activeAgentId = selectedAgentId;
            newStatus = ContactRequestStatus.IN_PROGRESS;
            await tx.requestAssignment.create({
              data: {
                contactRequestId: id,
                agentId: selectedAgentId,
                isActive: true,
                assignedAt: new Date(),
              },
            });
          } else {
            newStatus = ContactRequestStatus.NEW;
          }
        }

        const statusUpdate = await tx.contactRequest.updateMany({
          where: {
            id,
            status: request.status,
          },
          data: {
            status: newStatus,
          },
        });

        if (statusUpdate.count !== 1) {
          throw new ConflictException(
            'Contact request was modified concurrently. Please reload and retry.',
          );
        }

        await tx.auditLog.create({
          data: {
            actorId: caller.id,
            action: 'request.reopen',
            entityType: 'ContactRequest',
            entityId: id,
            meta: {
              previousStatus: request.status,
              newStatus,
              reason: trimmedReason,
              assignedAgentId: activeAgentId,
            },
          },
        });

        return {
          id: request.id,
          status: newStatus,
          assignedAgentId: activeAgentId,
          reason: trimmedReason,
        };
      });
    } catch (err: any) {
      if (isAssignmentUniqueConflict(err)) {
        throw new ConflictException('Concurrent assignment conflict during reopen. Please retry.');
      }
      throw err;
    }
  }

  /**
   * 11. View Assignment History
   * Authorized: ADMIN or currently assigned active AGENT
   */
  async getAssignmentHistory(
    id: string,
    caller: { id: string; role: Role },
  ) {
    const request = await this.prisma.contactRequest.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: 'asc' },
          select: {
            id: true,
            agentId: true,
            isActive: true,
            assignedAt: true,
            releasedAt: true,
            agent: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Contact request not found');
    }

    const isAdmin = caller.role === Role.ADMIN;
    let isAssignedAgent = false;

    if (caller.role === Role.AGENT) {
      const callerUser = await this.prisma.user.findUnique({
        where: { id: caller.id },
        select: { role: true, isActive: true },
      });
      if (callerUser?.role === Role.AGENT && callerUser.isActive === true) {
        isAssignedAgent = request.assignments.some(
          (a) => a.agentId === caller.id && a.isActive === true,
        );
      }
    }

    if (!isAdmin && !isAssignedAgent) {
      throw new ForbiddenException(
        'Only the currently assigned active agent or an administrator can view assignment history',
      );
    }

    return {
      contactRequestId: request.id,
      assignments: request.assignments.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        agent: {
          id: a.agent.id,
          fullName: a.agent.fullName,
          email: a.agent.email,
          phone: a.agent.phone,
        },
        isActive: a.isActive,
        assignedAt: a.assignedAt,
        releasedAt: a.releasedAt,
      })),
    };
  }
}
