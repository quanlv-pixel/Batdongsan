import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReopenContactRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Reopen reason is mandatory' })
  @MaxLength(500, { message: 'reason must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason!: string;
}
