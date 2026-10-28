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
import { ListingsService } from './listings.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { QueryListingsDto } from './dto/query-listings.dto.js';
import { QueryMyListingsDto } from './dto/query-my-listings.dto.js';
import { ModerateListingDto } from './dto/moderate-listing.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  /**
   * POST /api/listings
   * OWNER or AGENT only; ownerId comes strictly from authenticated identity; status starts as DRAFT.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async createListing(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.createListing(userId, dto);
  }

  /**
   * GET /api/listings/mine
   * Authenticated user's listings across all statuses.
   * NOTE: Registered strictly BEFORE /:id to prevent route shadowing.
   */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyListings(
    @CurrentUser('id') userId: string,
    @Query() query: QueryMyListingsDto,
  ) {
    return this.listingsService.getMyListings(userId, query);
  }

  /**
   * GET /api/listings
   * Public APPROVED listings only; bounded pagination and filters.
   */
  @Get()
  async getPublicListings(@Query() query: QueryListingsDto) {
    return this.listingsService.getPublicListings(query);
  }

  /**
   * GET /api/listings/:id/moderation-history
   * ADMIN only. Returns moderation logs for the listing.
   */
  @Get(':id/moderation-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getModerationHistory(@Param('id') id: string) {
    return this.listingsService.getModerationHistory(id);
  }

  /**
   * POST /api/listings/:id/moderate
   * ADMIN only; PENDING -> APPROVED or REJECTED.
   */
  @Post(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async moderateListing(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ModerateListingDto,
  ) {
    return this.listingsService.moderateListing(id, adminId, dto);
  }

  /**
   * POST /api/listings/:id/submit
   * Listing owner only; DRAFT or REJECTED -> PENDING.
   */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitListing(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.submitListing(id, userId);
  }

  /**
   * PATCH /api/listings/:id
   * Listing owner or ADMIN; only DRAFT/REJECTED listings are editable.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateListing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.updateListing(id, user, dto);
  }

  /**
   * GET /api/listings/:id
   * Public APPROVED detail only; returns 404 for non-APPROVED records.
   */
  @Get(':id')
  async getPublicListingDetail(@Param('id') id: string) {
    return this.listingsService.getPublicListingDetail(id);
  }
}
