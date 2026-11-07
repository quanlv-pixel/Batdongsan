import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignAgentDto {
  @IsString()
  @IsNotEmpty({ message: 'agentId must not be empty' })
  agentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'reason must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}
