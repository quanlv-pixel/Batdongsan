import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PropertyType,
  TransactionType,
  RentalPeriod,
} from '../../generated/prisma/enums.js';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @IsEnum(PropertyType, {
    message: `propertyType must be one of: ${Object.values(PropertyType).join(', ')}`,
  })
  propertyType!: PropertyType;

  @IsEnum(TransactionType, {
    message: `transactionType must be one of: ${Object.values(TransactionType).join(', ')}`,
  })
  transactionType!: TransactionType;

  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'priceVnd must be a positive integer greater than 0',
  })
  priceVnd!: string;

  @IsOptional()
  @IsEnum(RentalPeriod, {
    message: `rentalPeriod must be one of: ${Object.values(RentalPeriod).join(', ')}`,
  })
  rentalPeriod?: RentalPeriod;

  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'areaSqm must be at least 1 square meter' })
  areaSqm!: number;

  @IsString()
  @IsNotEmpty()
  province!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
