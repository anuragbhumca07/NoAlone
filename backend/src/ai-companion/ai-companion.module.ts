import { Module } from '@nestjs/common';
import { AiCompanionController } from './ai-companion.controller';
import { AiCompanionService } from './ai-companion.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiCompanionController],
  providers: [AiCompanionService],
})
export class AiCompanionModule {}
