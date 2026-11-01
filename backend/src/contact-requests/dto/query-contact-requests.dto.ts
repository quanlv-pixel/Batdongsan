import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContactRequestStatus } from '../../generated/prisma/enums.js';

export class QueryContactRequestsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ContactRequestStatus)
  status?: ContactRequestStatus;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'unassigned must be a boolean' })
  unassigned?: boolean;
}
