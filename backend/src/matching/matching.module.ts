import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingGateway],
})
export class MatchingModule {}
