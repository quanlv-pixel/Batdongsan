import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { Role, RegistrationIntent } from '../generated/prisma/enums.js';

describe('UsersModule Unit Tests', () => {
  let usersService: UsersService;
  let usersController: UsersController;

  let usersStore: Map<string, any>;
  let auditLogsStore: any[];

  beforeEach(() => {
    usersStore = new Map();
    auditLogsStore = [];

    // Seed test users
    usersStore.set('usr_admin_01', {
      id: 'usr_admin_01',
      email: 'admin@example.test',
      passwordHash: 'secret_hash',
      fullName: 'System Administrator',
      phone: '0901234567',
      avatarUrl: null,
      registrationIntent: RegistrationIntent.BUYER,
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    usersStore.set('usr_agent_01', {
      id: 'usr_agent_01',
      email: 'agent@example.test',
      passwordHash: 'secret_hash',
      fullName: 'Nguyễn Văn Môi Giới',
      phone: '0912345678',
      avatarUrl: null,
      registrationIntent: RegistrationIntent.AGENT,
      role: Role.AGENT,
      isActive: true,
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    });

    usersStore.set('usr_buyer_01', {
      id: 'usr_buyer_01',
      email: 'buyer@example.test',
      passwordHash: 'secret_hash',
      fullName: 'Trần Thị Người Mua',
      phone: '0923456789',
      avatarUrl: null,
      registrationIntent: RegistrationIntent.OWNER,
      role: Role.BUYER,
      isActive: true,
      createdAt: new Date('2026-01-03'),
      updatedAt: new Date('2026-01-03'),
    });

    const mockPrisma = {
      user: {
        count: vi.fn(async ({ where }: { where?: any }) => {
          let count = 0;
          for (const u of usersStore.values()) {
            if (where?.role && u.role !== where.role) continue;
            if (typeof where?.isActive === 'boolean' && u.isActive !== where.isActive) continue;
            if (where?.OR) {
              const term = where.OR[0]?.fullName?.contains?.toLowerCase();
              const match =
                u.fullName.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                (u.phone && u.phone.includes(term));
              if (!match) continue;
            }
            count++;
          }
          return count;
        }),
        findMany: vi.fn(async ({ where, select, skip = 0, take = 20 }: any) => {
          const list: any[] = [];
          for (const u of usersStore.values()) {
            if (where?.role && u.role !== where.role) continue;
            if (typeof where?.isActive === 'boolean' && u.isActive !== where.isActive) continue;
            if (where?.OR) {
              const term = where.OR[0]?.fullName?.contains?.toLowerCase();
              const match =
                u.fullName.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                (u.phone && u.phone.includes(term));
              if (!match) continue;
            }
            const projected: any = {};
            for (const [k, v] of Object.entries(select || {})) {
              if (k === '_count') {
                projected._count = { ownedListings: 0, assignedRequests: 0, contactRequests: 0 };
              } else if (v) {
                projected[k] = u[k];
              }
            }
            list.push(projected);
          }
          return list.slice(skip, skip + take);
        }),
        findUnique: vi.fn(async ({ where, select }: any) => {
          const u = usersStore.get(where.id);
          if (!u) return null;
          if (!select) return { ...u };
          const projected: any = {};
          for (const [k, v] of Object.entries(select)) {
            if (v) projected[k] = u[k];
          }
          return projected;
        }),
        update: vi.fn(async ({ where, data, select }: any) => {
          const u = usersStore.get(where.id);
          if (!u) throw new Error('Not found');
          Object.assign(u, data, { updatedAt: new Date() });
          const projected: any = {};
          for (const [k, v] of Object.entries(select || {})) {
            if (v) projected[k] = u[k];
          }
          return projected;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          const log = { id: `log_${Date.now()}`, ...data, createdAt: new Date() };
          auditLogsStore.push(log);
          return log;
        }),
      },
      $transaction: vi.fn(async (cb: any) => {
        return cb(mockPrisma);
      }),
    };

    usersService = new UsersService(mockPrisma as any);
    usersController = new UsersController(usersService);
  });

  describe('getUsers', () => {
    it('returns paginated users without exposing passwordHash', async () => {
      const res = await usersService.getUsers({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(3);
      expect(res.meta.total).toBe(3);
      for (const u of res.data) {
        expect((u as any).passwordHash).toBeUndefined();
        expect(u.id).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
      }
    });

    it('filters users by role correctly', async () => {
      const res = await usersService.getUsers({ role: Role.AGENT });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].role).toBe(Role.AGENT);
      expect(res.data[0].id).toBe('usr_agent_01');
    });

    it('searches users by name or email', async () => {
      const res = await usersService.getUsers({ search: 'Trần Thị' });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].fullName).toBe('Trần Thị Người Mua');
    });
  });

  describe('getAgents', () => {
    it('returns list of active agents for assignment dropdown', async () => {
      const agents = await usersService.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('usr_agent_01');
      expect(agents[0].fullName).toBe('Nguyễn Văn Môi Giới');
    });
  });

  describe('updateUserRole', () => {
    it('successfully changes role and creates AuditLog', async () => {
      const updated = await usersService.updateUserRole('usr_buyer_01', 'usr_admin_01', {
        role: Role.AGENT,
      });

      expect(updated.role).toBe(Role.AGENT);
      expect(usersStore.get('usr_buyer_01').role).toBe(Role.AGENT);

      expect(auditLogsStore).toHaveLength(1);
      expect(auditLogsStore[0].action).toBe('user.role_change');
      expect(auditLogsStore[0].actorId).toBe('usr_admin_01');
      expect(auditLogsStore[0].entityId).toBe('usr_buyer_01');
      expect(auditLogsStore[0].meta).toEqual({
        previousRole: Role.BUYER,
        newRole: Role.AGENT,
      });
    });

    it('rejects self-demotion when admin modifies their own role', async () => {
      await expect(
        usersService.updateUserRole('usr_admin_01', 'usr_admin_01', {
          role: Role.BUYER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      await expect(
        usersService.updateUserRole('non_existent', 'usr_admin_01', {
          role: Role.AGENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserStatus', () => {
    it('successfully toggles active status and creates AuditLog', async () => {
      const updated = await usersService.updateUserStatus('usr_buyer_01', 'usr_admin_01', {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
      expect(usersStore.get('usr_buyer_01').isActive).toBe(false);

      expect(auditLogsStore).toHaveLength(1);
      expect(auditLogsStore[0].action).toBe('user.status_change');
      expect(auditLogsStore[0].actorId).toBe('usr_admin_01');
      expect(auditLogsStore[0].entityId).toBe('usr_buyer_01');
      expect(auditLogsStore[0].meta).toEqual({
        previousStatus: true,
        newStatus: false,
      });
    });

    it('rejects self-deactivation when admin deactivates own account', async () => {
      await expect(
        usersService.updateUserStatus('usr_admin_01', 'usr_admin_01', {
          isActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      await expect(
        usersService.updateUserStatus('non_existent', 'usr_admin_01', {
          isActive: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('UsersController integration', () => {
    it('delegates to service correctly', async () => {
      const users = await usersController.getUsers({});
      expect(users.data).toHaveLength(3);

      const agents = await usersController.getAgents();
      expect(agents).toHaveLength(1);

      const roleRes = await usersController.updateUserRole('usr_buyer_01', 'usr_admin_01', {
        role: Role.OWNER,
      });
      expect(roleRes.role).toBe(Role.OWNER);

      const statusRes = await usersController.updateUserStatus('usr_buyer_01', 'usr_admin_01', {
        isActive: false,
      });
      expect(statusRes.isActive).toBe(false);
    });
  });
});
