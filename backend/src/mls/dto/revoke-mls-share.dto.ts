import { IsOptional, IsString } from 'class-validator';

export class RevokeMlsShareDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
