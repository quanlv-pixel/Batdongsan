import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { MlsModule } from './mls/mls.module.js';
import { ContactRequestsModule } from './contact-requests/contact-requests.module.js';

@Module({
  imports: [PrismaModule, AuthModule, ListingsModule, MlsModule, ContactRequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
