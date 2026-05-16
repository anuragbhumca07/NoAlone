import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (e) {
        retries--;
        this.logger.warn(`Database connection failed, retrying (${retries} left)...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    // Last attempt - let it throw
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
