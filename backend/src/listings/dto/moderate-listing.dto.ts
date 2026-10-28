import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ListingStatus } from '../../generated/prisma/enums.js';

export class ModerateListingDto {
  @IsEnum(
    { APPROVED: ListingStatus.APPROVED, REJECTED: ListingStatus.REJECTED },
    { message: 'status must be either APPROVED or REJECTED' },
  )
  @IsNotEmpty()
  status!: typeof ListingStatus.APPROVED | typeof ListingStatus.REJECTED;

  @IsOptional()
  @IsString()
  reason?: string;
}
