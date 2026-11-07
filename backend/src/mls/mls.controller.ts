import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MlsService } from './mls.service.js';
import { GrantMlsShareDto } from './dto/grant-mls-share.dto.js';
import { RevokeMlsShareDto } from './dto/revoke-mls-share.dto.js';
import { QueryReceivedMlsSharesDto } from './dto/query-received-mls-shares.dto.js';
import { QueryMlsShareHistoryDto } from './dto/query-mls-share-history.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('mls')
export class MlsController {
  constructor(private readonly mlsService: MlsService) {}

  /**
   * POST /api/mls/shares
   * Grant MLS access to an active AGENT recipient on an APPROVED listing.
   * Only listing owner can grant. Re-sharing and self-sharing rejected.
   */
  @Post(['shares', 'share'])
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async grantShare(
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto: GrantMlsShareDto,
  ) {
    return this.mlsService.grantShare(caller, dto);
  }

  /**
   * POST /api/mls/shares/:id/revoke
   * DELETE /api/mls/shares/:id
   * Revoke an active MLS share.
   * Listing owner or ADMIN only. Preserves audit history.
   */
  @Post(['shares/:id/revoke', 'revoke/:id'])
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeShare(
    @Param('id') shareId: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto?: RevokeMlsShareDto,
  ) {
    return this.mlsService.revokeShare(shareId, caller, dto);
  }

  @Delete('shares/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteShare(
    @Param('id') shareId: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Body() dto?: RevokeMlsShareDto,
  ) {
    return this.mlsService.revokeShare(shareId, caller, dto);
  }

  /**
   * GET /api/mls/shares/received
   * Listing shares received by the authenticated AGENT.
   * Only active, non-expired shares for APPROVED listings with active owners.
   * Registered strictly before parameterized routes.
   */
  @Get(['shares/received', 'received'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  async getReceivedShares(
    @CurrentUser('id') agentId: string,
    @Query() query: QueryReceivedMlsSharesDto,
  ) {
    return this.mlsService.getReceivedShares(agentId, query);
  }

  /**
   * GET /api/mls/listings/:listingId/shares
   * Listing share history for listing owner or ADMIN.
   * Registered before /listings/:id to avoid parameter shadowing.
   */
  @Get(['listings/:listingId/shares', 'shares/listing/:listingId'])
  @UseGuards(JwtAuthGuard)
  async getListingShareHistory(
    @Param('listingId') listingId: string,
    @CurrentUser() caller: { id: string; role: Role },
    @Query() query: QueryMlsShareHistoryDto,
  ) {
    return this.mlsService.getListingShareHistory(listingId, caller, query);
  }

  /**
   * GET /api/mls/listings/:id
   * View internal details for an authorized shared listing.
   * Accessible by listing owner, ADMIN, or AGENT with active non-expired share.
   * Returns explicit allowlist including streetAddress, latitude, longitude, owner contact.
   */
  @Get(['listings/:id', 'listings/:id/detail'])
  @UseGuards(JwtAuthGuard)
  async getSharedListingDetail(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role },
  ) {
    return this.mlsService.getSharedListingDetail(id, caller);
  }
}
