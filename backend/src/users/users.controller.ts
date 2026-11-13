import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/admin/users
   * Paginated user list for admin user & role management.
   */
  @Get('users')
  async getUsers(@Query() query: QueryUsersDto) {
    return this.usersService.getUsers(query);
  }

  /**
   * GET /api/admin/agents
   * Active agents list for request assignment modal.
   */
  @Get(['agents', 'users/agents'])
  async getAgents() {
    return this.usersService.getAgents();
  }

  /**
   * PATCH /api/admin/users/:id/role
   * Update role for a user (BUYER, OWNER, AGENT, ADMIN). Rejects self-demotion.
   */
  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, adminId, dto);
  }

  /**
   * PATCH /api/admin/users/:id/status
   * Toggle active/inactive for a user. Rejects self-deactivation.
   */
  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, adminId, dto);
  }
}
