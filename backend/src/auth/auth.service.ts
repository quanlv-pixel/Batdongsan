import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Role, RegistrationIntent } from '../generated/prisma/enums.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const registrationIntent = dto.registrationIntent ?? RegistrationIntent.BUYER;

    // Assign initial role based on self-selected registrationIntent (BUYER/OWNER/AGENT).
    // ADMIN is never assignable via public self-registration.
    let assignedRole: Role;
    switch (registrationIntent) {
      case RegistrationIntent.AGENT:
        assignedRole = Role.AGENT;
        break;
      case RegistrationIntent.OWNER:
        assignedRole = Role.OWNER;
        break;
      case RegistrationIntent.BUYER:
      default:
        assignedRole = Role.BUYER;
        break;
    }

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName.trim(),
        registrationIntent,
        role: assignedRole,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        registrationIntent: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const candidates = await this.prisma.user.findMany({
      where: {
        email: normalizedEmail,
        isActive: true,
        ...(dto.userId ? { id: dto.userId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    // Timing-attack safe comparison: do not reveal whether email or password was invalid
    if (candidates.length === 0) {
      await bcrypt.compare(dto.password, '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890123456789012345678');
      throw new UnauthorizedException('Invalid credentials');
    }

    const matchedUsers: typeof candidates = [];
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(dto.password, candidate.passwordHash);
      if (isMatch) {
        matchedUsers.push(candidate);
      }
    }

    if (matchedUsers.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (matchedUsers.length > 1) {
      return {
        requiresAccountSelection: true,
        accounts: matchedUsers.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          createdAt: u.createdAt,
        })),
      };
    }

    const user = matchedUsers[0];
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        registrationIntent: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account not found or inactive');
    }

    return user;
  }
}
