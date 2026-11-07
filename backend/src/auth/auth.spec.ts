import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  ConflictException,
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

  // In-memory mock database store for realistic testing
  let usersStore: Map<string, any>;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: { email?: string; id?: string }; select?: Record<string, boolean> }) => {
        let found: any = null;
        if (where.email) {
          found = usersStore.get(where.email.toLowerCase().trim()) ?? null;
        } else if (where.id) {
          for (const u of usersStore.values()) {
            if (u.id === where.id) {
              found = u;
              break;
            }
          }
        }
        if (!found) return null;
        if (select) {
          const projected: any = {};
          for (const [key, val] of Object.entries(select)) {
            if (val) {
              projected[key] = found[key];
            }
          }
          return projected;
        }
        return found;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const newUser = {
          id: `usr_${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersStore.set(data.email.toLowerCase().trim(), newUser);
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
    it('should always create user with role = BUYER regardless of registrationIntent = AGENT', async () => {
      const result = await authService.register({
        email: 'agent_applicant@example.test',
        password: 'Password123!',
        fullName: 'Nguyễn Văn Đăng Ký Môi Giới',
        registrationIntent: RegistrationIntent.AGENT,
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(Role.BUYER);
      expect(result.registrationIntent).toBe(RegistrationIntent.AGENT);
      expect((result as any).passwordHash).toBeUndefined();

      // Verify the record in storage also has role = BUYER
      const saved = usersStore.get('agent_applicant@example.test');
      expect(saved.role).toBe(Role.BUYER);
    });

    it('should always create user with role = BUYER regardless of registrationIntent = OWNER', async () => {
      const result = await authService.register({
        email: 'owner_applicant@example.test',
        password: 'Password123!',
        fullName: 'Trần Thị Chủ Nhà',
        registrationIntent: RegistrationIntent.OWNER,
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(Role.BUYER);
      expect(result.registrationIntent).toBe(RegistrationIntent.OWNER);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should reject registration with duplicate email with 409 ConflictException', async () => {
      await authService.register({
        email: 'duplicate@example.test',
        password: 'Password123!',
        fullName: 'Người Dùng Thứ Nhất',
        registrationIntent: RegistrationIntent.BUYER,
      });

      // Second registration with the exact same email (different case)
      await expect(
        authService.register({
          email: 'DUPLICATE@example.test',
          password: 'Password456!',
          fullName: 'Người Dùng Thứ Hai',
          registrationIntent: RegistrationIntent.BUYER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Login tests
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create an active test user
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      usersStore.set('test_login@example.test', {
        id: 'usr_test_login_01',
        email: 'test_login@example.test',
        passwordHash,
        fullName: 'Lê Văn Đăng Nhập',
        role: Role.BUYER,
        registrationIntent: RegistrationIntent.BUYER,
        isActive: true,
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
      expect(result.user.email).toBe('test_login@example.test');
      expect(result.user.role).toBe(Role.BUYER);

      // Verify token is validly signed and contains correct payload
      const decoded = jwtService.verify(result.accessToken, {
        secret: 'test_jwt_secret_for_unit_tests',
      });
      expect(decoded.sub).toBe('usr_test_login_01');
      expect(decoded.email).toBe('test_login@example.test');
      expect(decoded.role).toBe(Role.BUYER);
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
      usersStore.set('me@example.test', {
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
      usersStore.set('inactive@example.test', {
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
      usersStore.set('downgraded@example.test', {
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
      usersStore.set('profile_user@example.test', {
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
