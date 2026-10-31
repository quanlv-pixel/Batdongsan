import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MlsSharePermission } from '../../generated/prisma/enums.js';

export class GrantMlsShareDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsOptional()
  @IsEnum(MlsSharePermission)
  permission?: MlsSharePermission = MlsSharePermission.VIEW;

  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
