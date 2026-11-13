import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;
}
