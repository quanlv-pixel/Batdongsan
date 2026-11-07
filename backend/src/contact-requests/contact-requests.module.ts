import { Module } from '@nestjs/common';
import { ContactRequestsController } from './contact-requests.controller.js';
import { ContactRequestsService } from './contact-requests.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContactRequestsController],
  providers: [ContactRequestsService],
  exports: [ContactRequestsService],
})
export class ContactRequestsModule {}
