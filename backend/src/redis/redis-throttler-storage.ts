import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

// Backs @nestjs/throttler with the shared Redis instance instead of its
// default in-memory Map — production runs multiple backend instances, and
// an in-memory counter per process means each instance enforces its own
// separate limit rather than one shared budget across all of them.
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  // Same degrade path as the rest of RedisService: if Redis is unreachable,
  // fall back to per-instance in-memory counting rather than no limiting at
  // all — weaker than the shared limit, but still real protection.
  private readonly memHits = new Map<string, { count: number; expiresAt: number }>();

  constructor(private redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${throttlerName}:${key}`;
    const result = await this.redis.incrWithExpiry(redisKey, ttl);

    if (result) {
      const isBlocked = result.totalHits > limit;
      return {
        totalHits: result.totalHits,
        timeToExpire: Math.ceil(result.ttlMs / 1000),
        isBlocked,
        timeToBlockExpire: isBlocked ? Math.ceil((blockDuration || ttl) / 1000) : 0,
      };
    }

    const now = Date.now();
    const existing = this.memHits.get(redisKey);
    const entry = existing && existing.expiresAt > now ? existing : { count: 0, expiresAt: now + ttl };
    entry.count += 1;
    this.memHits.set(redisKey, entry);
    const isBlocked = entry.count > limit;
    return {
      totalHits: entry.count,
      timeToExpire: Math.ceil((entry.expiresAt - now) / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil((blockDuration || ttl) / 1000) : 0,
    };
  }
}
