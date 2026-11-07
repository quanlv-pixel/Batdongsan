import { Module } from '@nestjs/common';
import { MlsController } from './mls.controller.js';
import { MlsService } from './mls.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MlsController],
  providers: [MlsService],
  exports: [MlsService],
})
export class MlsModule {}
