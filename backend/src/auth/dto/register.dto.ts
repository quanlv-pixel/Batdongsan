import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RegistrationIntent } from '../../generated/prisma/enums.js';

export class RegisterDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsOptional()
  @IsEnum(RegistrationIntent, {
    message: 'registrationIntent must be one of: BUYER, OWNER, AGENT',
  })
  registrationIntent?: RegistrationIntent;
}
