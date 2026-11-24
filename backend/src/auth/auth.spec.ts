import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role, RegistrationIntent } from '../generated/prisma/enums.js';

describe('AuthModule Unit Tests', () => {
  let authService: AuthService;
  let authController: AuthController;
  let jwtService: JwtService;
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  // In-memory mock database store keyed by user id (supports multiple accounts per email)
  let usersStore: Map<string, any>;
  let nextUserId = 1;

  const projectUser = (found: any, select?: Record<string, boolean>) => {
    if (!select) return found;
    const projected: any = {};
    for (const [key, val] of Object.entries(select)) {
      if (val) {
        projected[key] = found[key];
      }
    }
    return projected;
  };

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: { email?: string; id?: string }; select?: Record<string, boolean> }) => {
        let found: any = null;
        if (where.id) {
          found = usersStore.get(where.id) ?? null;
        } else if (where.email) {
          const targetEmail = where.email.toLowerCase().trim();
          for (const u of usersStore.values()) {
            if (u.email === targetEmail) {
              found = u;
              break;
            }
          }
        }
        if (!found) return null;
        return projectUser(found, select);
      }),
      findMany: vi.fn(async ({ where, select }: { where?: { email?: string; isActive?: boolean; id?: string }; select?: Record<string, boolean> }) => {
        const results: any[] = [];
        for (const u of usersStore.values()) {
          if (where?.email && u.email !== where.email.toLowerCase().trim()) continue;
          if (typeof where?.isActive === 'boolean' && u.isActive !== where.isActive) continue;
          if (where?.id && u.id !== where.id) continue;
          results.push(projectUser(u, select));
        }
        return results;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const newUser = {
          id: `usr_${nextUserId++}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersStore.set(newUser.id, newUser);
        return {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          registrationIntent: newUser.registrationIntent,
          createdAt: newUser.createdAt,
        };
      }),
    },
  };

  beforeEach(async () => {
    usersStore = new Map();
    nextUserId = 1;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test_jwt_secret_for_unit_tests',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authController = module.get<AuthController>(AuthController);
    jwtService = module.get<JwtService>(JwtService);
    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
    expect(authService).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Registration tests
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should create user with role = AGENT when registrationIntent = AGENT', async () => {
      const result = await authService.register({
        email: 'agent_applicant@example.test',
        password: 'Password123!',
        fullName: 'Nguyễn Văn Đăng Ký Môi Giới',
        registrationIntent: RegistrationIntent.AGENT,
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(Role.AGENT);
      expect(result.registrationIntent).toBe(RegistrationIntent.AGENT);
      expect((result as any).passwordHash).toBeUndefined();

      // Verify the record in storage also has role = AGENT
      const saved = usersStore.get(result.id);
      expect(saved.role).toBe(Role.AGENT);
    });

    it('should create user with role = OWNER when registrationIntent = OWNER', async () => {
      const result = await authService.register({
        email: 'owner_applicant@example.test',
        password: 'Password123!',
        fullName: 'Trần Thị Chủ Nhà',
        registrationIntent: RegistrationIntent.OWNER,
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(Role.OWNER);
      expect(result.registrationIntent).toBe(RegistrationIntent.OWNER);
      expect((result as any).passwordHash).toBeUndefined();

      const saved = usersStore.get(result.id);
      expect(saved.role).toBe(Role.OWNER);
    });

    it('should default role to BUYER when registrationIntent is omitted and never assign ADMIN', async () => {
      const buyerResult = await authService.register({
        email: 'default_buyer@example.test',
        password: 'Password123!',
        fullName: 'Người Mua Mặc Định',
      });

      expect(buyerResult.role).toBe(Role.BUYER);
      expect(buyerResult.registrationIntent).toBe(RegistrationIntent.BUYER);

      const adminAttempt = await authService.register({
        email: 'admin_attempt@example.test',
        password: 'Password123!',
        fullName: 'Admin Escalation Attempt',
        registrationIntent: 'ADMIN' as unknown as RegistrationIntent,
      });

      expect(adminAttempt.role).toBe(Role.BUYER);
    });

    it('should allow registering multiple distinct accounts with the same email', async () => {
      const first = await authService.register({
        email: 'shared@gmail.com',
        password: 'Password123!',
        fullName: 'Tài Khoản Người Mua',
        registrationIntent: RegistrationIntent.BUYER,
      });

      const second = await authService.register({
        email: 'SHARED@gmail.com',
        password: 'Password456!',
        fullName: 'Tài Khoản Môi Giới',
        registrationIntent: RegistrationIntent.AGENT,
      });

      expect(first.id).not.toBe(second.id);
      expect(first.email).toBe('shared@gmail.com');
      expect(second.email).toBe('shared@gmail.com');
      expect(first.role).toBe(Role.BUYER);
      expect(second.role).toBe(Role.AGENT);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Login tests
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create an active test user
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      usersStore.set('usr_test_login_01', {
        id: 'usr_test_login_01',
        email: 'test_login@example.test',
        passwordHash,
        fullName: 'Lê Văn Đăng Nhập',
        role: Role.BUYER,
        registrationIntent: RegistrationIntent.BUYER,
        isActive: true,
        createdAt: new Date(),
      });
    });

    it('should return a signed JWT access token on valid credentials', async () => {
      const result = await authService.login({
        email: 'test_login@example.test',
        password: 'CorrectPassword123!',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(result.user?.email).toBe('test_login@example.test');
      expect(result.user?.role).toBe(Role.BUYER);

      // Verify token is validly signed and contains correct payload
      const decoded = jwtService.verify(result.accessToken!, {
        secret: 'test_jwt_secret_for_unit_tests',
      });
      expect(decoded.sub).toBe('usr_test_login_01');
      expect(decoded.email).toBe('test_login@example.test');
      expect(decoded.role).toBe(Role.BUYER);
    });

    it('should directly log into the matching account when multiple accounts share an email with different passwords', async () => {
      const agentHash = await bcrypt.hash('AgentSecret123!', 10);
      usersStore.set('usr_test_login_agent', {
        id: 'usr_test_login_agent',
        email: 'test_login@example.test',
        passwordHash: agentHash,
        fullName: 'Lê Văn Môi Giới',
        role: Role.AGENT,
        registrationIntent: RegistrationIntent.AGENT,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await authService.login({
        email: 'test_login@example.test',
        password: 'AgentSecret123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user?.id).toBe('usr_test_login_agent');
      expect(result.user?.role).toBe(Role.AGENT);
    });

    it('should return account selection when multiple accounts share the same email and password, and allow login with userId', async () => {
      const sameHash = await bcrypt.hash('CorrectPassword123!', 10);
      usersStore.set('usr_test_login_agent_same_pw', {
        id: 'usr_test_login_agent_same_pw',
        email: 'test_login@example.test',
        passwordHash: sameHash,
        fullName: 'Lê Văn Môi Giới 2',
        role: Role.AGENT,
        registrationIntent: RegistrationIntent.AGENT,
        isActive: true,
        createdAt: new Date(),
      });

      const selectionResult = await authService.login({
        email: 'test_login@example.test',
        password: 'CorrectPassword123!',
      });

      expect(selectionResult.requiresAccountSelection).toBe(true);
      expect(selectionResult.accounts).toHaveLength(2);
      expect(selectionResult.accessToken).toBeUndefined();

      const finalResult = await authService.login({
        email: 'test_login@example.test',
        password: 'CorrectPassword123!',
        userId: 'usr_test_login_agent_same_pw',
      });

      expect(finalResult.accessToken).toBeDefined();
      expect(finalResult.user?.id).toBe('usr_test_login_agent_same_pw');
      expect(finalResult.user?.role).toBe(Role.AGENT);
    });

    it('should return 401 UnauthorizedException on wrong password without revealing detail', async () => {
      await expect(
        authService.login({
          email: 'test_login@example.test',
          password: 'WrongPassword999!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return 401 UnauthorizedException on non-existent email without revealing detail', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.test',
          password: 'SomePassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. GET /auth/me & JwtAuthGuard tests
  // ─────────────────────────────────────────────────────────────
  describe('GET /auth/me and JwtAuthGuard', () => {
    it('should reject requests with missing Authorization header with 401', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject requests with invalid or malformed token with 401', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer invalid.token.payload',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should accept valid JWT token and attach user to request', async () => {
      usersStore.set('usr_me_01', {
        id: 'usr_me_01',
        email: 'me@example.test',
        fullName: 'Trần Văn Me',
        role: Role.BUYER,
        isActive: true,
      });

      const token = jwtService.sign(
        {
          sub: 'usr_me_01',
          email: 'me@example.test',
          role: Role.BUYER,
          fullName: 'Trần Văn Me',
        },
        { secret: 'test_jwt_secret_for_unit_tests' },
      );

      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      const canActivate = await jwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('usr_me_01');
      expect(mockRequest.user.email).toBe('me@example.test');
      expect(mockRequest.user.role).toBe(Role.BUYER);
    });

    it('should reject inactive users presenting a valid token with 401 UnauthorizedException', async () => {
      usersStore.set('usr_inactive_01', {
        id: 'usr_inactive_01',
        email: 'inactive@example.test',
        fullName: 'Nguyễn Thị Bị Khóa',
        role: Role.BUYER,
        isActive: false,
      });

      const token = jwtService.sign(
        {
          sub: 'usr_inactive_01',
          email: 'inactive@example.test',
          role: Role.BUYER,
          fullName: 'Nguyễn Thị Bị Khóa',
        },
        { secret: 'test_jwt_secret_for_unit_tests' },
      );

      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should overwrite old token role with current database role and reject if downgraded', async () => {
      // User was downgraded to BUYER in PostgreSQL
      usersStore.set('usr_downgraded_01', {
        id: 'usr_downgraded_01',
        email: 'downgraded@example.test',
        fullName: 'Người Dùng Bị Hạ Quyền',
        role: Role.BUYER,
        isActive: true,
      });

      // Old token still claims ADMIN in payload
      const token = jwtService.sign(
        {
          sub: 'usr_downgraded_01',
          email: 'downgraded@example.test',
          role: Role.ADMIN,
          fullName: 'Người Dùng Bị Hạ Quyền',
        },
        { secret: 'test_jwt_secret_for_unit_tests' },
      );

      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      // 1. JwtAuthGuard loads current user from DB and attaches current DB role (BUYER)
      const canActivateJwt = await jwtAuthGuard.canActivate(context);
      expect(canActivateJwt).toBe(true);
      expect(mockRequest.user.role).toBe(Role.BUYER); // Verified: Fresh DB role overrides stale token payload!

      // 2. RolesGuard requires ADMIN -> must reject with 403 Forbidden
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should return profile without passwordHash for authenticated user', async () => {
      usersStore.set('usr_profile_01', {
        id: 'usr_profile_01',
        email: 'profile_user@example.test',
        passwordHash: 'secret_hash_value_that_must_never_leak',
        fullName: 'Phạm Thị Profile',
        role: Role.AGENT,
        phone: '0901234567',
        avatarUrl: null,
        registrationIntent: RegistrationIntent.AGENT,
        isActive: true,
        createdAt: new Date(),
      });

      const profile = await authService.getProfile('usr_profile_01');
      expect(profile).toBeDefined();
      expect(profile.id).toBe('usr_profile_01');
      expect(profile.email).toBe('profile_user@example.test');
      expect(profile.role).toBe(Role.AGENT);
      expect((profile as any).passwordHash).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. RolesGuard tests
  // ─────────────────────────────────────────────────────────────
  describe('RolesGuard and @Roles() decorator', () => {
    it('should deny access with 403 ForbiddenException when user lacks required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'usr_buyer_1', role: Role.BUYER },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when user possesses one of the required roles', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.AGENT]);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'usr_agent_1', role: Role.AGENT },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow access when endpoint has no @Roles() decorator', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'usr_buyer_1', role: Role.BUYER },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
