import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/admin/users
   * Paginated user list with role/status filters and search keyword.
   * Explicitly excludes passwordHash.
   */
  async getUsers(query: QueryUsersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          registrationIntent: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedListings: true,
              assignedRequests: true,
              contactRequests: true,
            },
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
   * GET /api/admin/agents
   * Returns active users with AGENT role for assignment selector.
   */
  async getAgents() {
    return this.prisma.user.findMany({
      where: {
        role: Role.AGENT,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  /**
   * PATCH /api/admin/users/:id/role
   * Updates user role. Prevents self-demotion and writes to AuditLog.
   */
  async updateUserRole(targetUserId: string, callerId: string, dto: UpdateUserRoleDto) {
    if (targetUserId === callerId) {
      throw new BadRequestException('Cannot modify your own administrative role');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { role: dto.role },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          registrationIntent: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: callerId,
          action: 'user.role_change',
          entityType: 'User',
          entityId: targetUserId,
          meta: {
            previousRole: target.role,
            newRole: dto.role,
          },
        },
      });

      return updated;
    });
  }

  /**
   * PATCH /api/admin/users/:id/status
   * Updates user active status. Prevents self-deactivation and writes to AuditLog.
   */
  async updateUserStatus(targetUserId: string, callerId: string, dto: UpdateUserStatusDto) {
    if (targetUserId === callerId && dto.isActive === false) {
      throw new BadRequestException('Cannot deactivate your own administrative account');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true, email: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { isActive: dto.isActive },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          registrationIntent: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: callerId,
          action: 'user.status_change',
          entityType: 'User',
          entityId: targetUserId,
          meta: {
            previousStatus: target.isActive,
            newStatus: dto.isActive,
          },
        },
      });

      return updated;
    });
  }
}
