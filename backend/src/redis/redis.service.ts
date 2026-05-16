import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.client.setex(`online:${userId}`, 300, socketId);
    await this.client.sadd('online_users', userId);
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.client.del(`online:${userId}`);
    await this.client.srem('online_users', userId);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.client.exists(`online:${userId}`);
    return result === 1;
  }

  async getOnlineUsers(): Promise<string[]> {
    return this.client.smembers('online_users');
  }

  async addToMatchingPool(userId: string, data: object): Promise<void> {
    await this.client.setex(`matching:${userId}`, 120, JSON.stringify(data));
    await this.client.sadd('matching_pool', userId);
  }

  async removeFromMatchingPool(userId: string): Promise<void> {
    await this.client.del(`matching:${userId}`);
    await this.client.srem('matching_pool', userId);
  }

  async getMatchingPool(): Promise<string[]> {
    return this.client.smembers('matching_pool');
  }

  async getMatchingData(userId: string): Promise<any | null> {
    const data = await this.client.get(`matching:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
}
