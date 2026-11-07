import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

import { initEnvironment } from '../config/env.config.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        initEnvironment();
        return {
          secret: process.env.JWT_SECRET,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
