import {
  Equals,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateContactRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'listingId must not be empty' })
  listingId!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'message must be a string' })
  @IsNotEmpty({ message: 'message must not be blank when provided' })
  @MaxLength(1000, { message: 'message must not exceed 1000 characters' })
  message?: string;

  @IsBoolean({ message: 'contactConsent must be a boolean' })
  @Equals(true, { message: 'contactConsent must be true' })
  contactConsent!: boolean;
}
