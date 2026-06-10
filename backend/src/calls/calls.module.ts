import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { MeetService } from './meet.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway, MeetService],
  exports: [CallsService, MeetService],
})
export class CallsModule {}
