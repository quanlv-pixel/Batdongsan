import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ContactRequestStatus } from '../../generated/prisma/enums.js';

export class UpdateRequestStatusDto {
  @IsEnum(ContactRequestStatus, {
    message: `status must be one of: ${Object.values(ContactRequestStatus).join(', ')}`,
  })
  status!: ContactRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'note must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}
