import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  onModuleInit() {
    try {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryStrategy: (times) => Math.min(times * 200, 5000),
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('Redis connected');
      });
      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.error('Redis error', err.message);
      });
      this.client.connect().catch((err) => {
        this.logger.warn(`Redis initial connect failed: ${err.message} — continuing without Redis`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis init failed: ${err.message} — continuing without Redis`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try { await this.client.quit(); } catch {}
    }
  }

  private isReady(): boolean {
    return !!this.client && this.connected;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady()) return;
    try {
      if (ttlSeconds) await this.client!.setex(key, ttlSeconds, value);
      else await this.client!.set(key, value);
    } catch {}
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try { return await this.client!.get(key); } catch { return null; }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client!.del(key); } catch {}
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.setex(`online:${userId}`, 300, socketId);
      await this.client!.sadd('online_users', userId);
    } catch {}
  }

  async setUserOffline(userId: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.del(`online:${userId}`);
      await this.client!.srem('online_users', userId);
    } catch {}
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const result = await this.client!.exists(`online:${userId}`);
      return result === 1;
    } catch { return false; }
  }

  async getOnlineUsers(): Promise<string[]> {
    if (!this.isReady()) return [];
    try { return await this.client!.smembers('online_users'); } catch { return []; }
  }

  async addToMatchingPool(userId: string, data: object): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.setex(`matching:${userId}`, 120, JSON.stringify(data));
      await this.client!.sadd('matching_pool', userId);
    } catch {}
  }

  async removeFromMatchingPool(userId: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.del(`matching:${userId}`);
      await this.client!.srem('matching_pool', userId);
    } catch {}
  }

  async getMatchingPool(): Promise<string[]> {
    if (!this.isReady()) return [];
    try { return await this.client!.smembers('matching_pool'); } catch { return []; }
  }

  async getMatchingData(userId: string): Promise<any | null> {
    if (!this.isReady()) return null;
    try {
      const data = await this.client!.get(`matching:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client!.publish(channel, message); } catch {}
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client!.hset(key, field, value); } catch {}
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try { return await this.client!.hget(key, field); } catch { return null; }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isReady()) return {};
    try { return await this.client!.hgetall(key); } catch { return {}; }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client!.hdel(key, field); } catch {}
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client!.expire(key, seconds); } catch {}
  }
}
