import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContactRequestsService } from './contact-requests.service.js';
import { CreateContactRequestDto } from './dto/create-contact-request.dto.js';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto.js';
import { AssignAgentDto } from './dto/assign-agent.dto.js';
import { ReassignAgentDto } from './dto/reassign-agent.dto.js';
import { ReopenContactRequestDto } from './dto/reopen-contact-request.dto.js';
import { QueryContactRequestsDto } from './dto/query-contact-requests.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('contact-requests')
export class ContactRequestsController {
  constructor(private readonly contactRequestsService: ContactRequestsService) {}

  /**
   * POST /api/contact-requests
   * Create a contact request for an APPROVED listing with mandatory consent.
   * Allowed roles: BUYER, OWNER, AGENT (ADMIN rejected with 403).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: CreateContactRequestDto,
  ) {
    return this.contactRequestsService.createRequest(caller, dto);
  }

  /**
   * GET /api/contact-requests/my-requests
   * Buyer views their own submitted requests.
   */
  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyRequests(
    @CurrentUser('id') buyerId: string,
    @Query() query: QueryContactRequestsDto,
  ) {
    return this.contactRequestsService.getMyRequests(buyerId, query);
  }

  /**
   * GET /api/contact-requests/assigned
   * AGENT views active requests currently assigned to them.
   */
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  async getAssignedRequests(
    @CurrentUser('id') agentId: string,
    @Query() query: QueryContactRequestsDto,
  ) {
    return this.contactRequestsService.getAssignedRequests(agentId, query);
  }

  /**
   * GET /api/contact-requests/for-owned-listings
   * Listing owner views metadata-only request overview for listings they own.
   */
  @Get('for-owned-listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.AGENT)
  async getForOwnedListings(
    @CurrentUser('id') ownerId: string,
    @Query() query: QueryContactRequestsDto,
  ) {
    return this.contactRequestsService.getForOwnedListings(ownerId, query);
  }

  /**
   * GET /api/contact-requests
   * ADMIN request management and filtering across the entire system.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllRequests(@Query() query: QueryContactRequestsDto) {
    return this.contactRequestsService.getAllRequests(query);
  }

  /**
   * GET /api/contact-requests/:id
   * Request detail with caller-specific privacy allowlists.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRequestDetail(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.contactRequestsService.getRequestDetail(id, caller);
  }

  /**
   * PATCH /api/contact-requests/:id/status
   * Update request status (State Machine).
   * Authorized: Currently assigned active AGENT or ADMIN.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.contactRequestsService.updateStatus(id, caller, dto);
  }

  /**
   * POST /api/contact-requests/:id/assign
   * ADMIN first assignment when no active assignment exists.
   */
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async assignAgent(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: AssignAgentDto,
  ) {
    return this.contactRequestsService.assignAgent(id, caller, dto);
  }

  /**
   * POST /api/contact-requests/:id/reassign
   * ADMIN reassignment: releases old assignment and creates new active assignment.
   */
  @Post(':id/reassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reassignAgent(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: ReassignAgentDto,
  ) {
    return this.contactRequestsService.reassignAgent(id, caller, dto);
  }

  /**
   * POST /api/contact-requests/:id/reopen
   * ADMIN reopens terminal (COMPLETED/REJECTED) request with mandatory reason.
   */
  @Post(':id/reopen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reopenRequest(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: ReopenContactRequestDto,
  ) {
    return this.contactRequestsService.reopenRequest(id, caller, dto);
  }

  /**
   * GET /api/contact-requests/:id/assignments
   * View assignment history in chronological order.
   * Authorized: ADMIN or currently assigned active AGENT.
   */
  @Get(':id/assignments')
  @UseGuards(JwtAuthGuard)
  async getAssignmentHistory(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.contactRequestsService.getAssignmentHistory(id, caller);
  }
}
