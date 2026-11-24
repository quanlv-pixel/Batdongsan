import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReassignAgentDto {
  @ValidateIf((o: ReassignAgentDto) => !o.newAgentId)
  @IsString()
  @IsNotEmpty({ message: 'agentId must not be empty' })
  agentId?: string;

  @ValidateIf((o: ReassignAgentDto) => !o.agentId)
  @IsString()
  @IsNotEmpty({ message: 'newAgentId must not be empty' })
  newAgentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'reason must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}
