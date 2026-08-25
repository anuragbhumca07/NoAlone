import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  // In-process fallback used whenever Redis is unreachable, so presence and
  // matching keep working (single-instance semantics only) instead of
  // silently no-oping. Real Redis is still used whenever it's up so state
  // stays correct across multiple backend instances.
  private memOnlineUsers = new Set<string>();
  private memMatchingPool = new Map<string, { data: any; expiresAt: number }>();

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

  // Atomic increment-with-expiry for rate limiting: production runs multiple
  // backend instances, so an in-memory counter per process would let each
  // instance track its own separate budget instead of a shared one. Returns
  // null when Redis is unreachable so the caller can fail open (same
  // philosophy as the rest of this service — an outage shouldn't turn into
  // "everyone gets rate-limited").
  private static readonly INCR_WITH_EXPIRY_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return {current, ttl}
  `;

  async incrWithExpiry(key: string, ttlMs: number): Promise<{ totalHits: number; ttlMs: number } | null> {
    if (!this.isReady()) return null;
    try {
      const [totalHits, ttl] = (await this.client!.eval(
        RedisService.INCR_WITH_EXPIRY_SCRIPT,
        1,
        key,
        ttlMs,
      )) as [number, number];
      return { totalHits, ttlMs: ttl };
    } catch {
      return null;
    }
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    this.memOnlineUsers.add(userId);
    if (!this.isReady()) return;
    try {
      await this.client!.setex(`online:${userId}`, 300, socketId);
      await this.client!.sadd('online_users', userId);
    } catch {}
  }

  async setUserOffline(userId: string): Promise<void> {
    this.memOnlineUsers.delete(userId);
    if (!this.isReady()) return;
    try {
      await this.client!.del(`online:${userId}`);
      await this.client!.srem('online_users', userId);
    } catch {}
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.isReady()) return this.memOnlineUsers.has(userId);
    try {
      const result = await this.client!.exists(`online:${userId}`);
      return result === 1;
    } catch { return this.memOnlineUsers.has(userId); }
  }

  async getOnlineUsers(): Promise<string[]> {
    if (!this.isReady()) return Array.from(this.memOnlineUsers);
    try { return await this.client!.smembers('online_users'); } catch { return Array.from(this.memOnlineUsers); }
  }

  async addToMatchingPool(userId: string, data: object): Promise<void> {
    this.memMatchingPool.set(userId, { data, expiresAt: Date.now() + 120_000 });
    if (!this.isReady()) return;
    try {
      await this.client!.setex(`matching:${userId}`, 120, JSON.stringify(data));
      await this.client!.sadd('matching_pool', userId);
    } catch {}
  }

  async removeFromMatchingPool(userId: string): Promise<void> {
    this.memMatchingPool.delete(userId);
    if (!this.isReady()) return;
    try {
      await this.client!.del(`matching:${userId}`);
      await this.client!.srem('matching_pool', userId);
    } catch {}
  }

  async getMatchingPool(): Promise<string[]> {
    if (!this.isReady()) return this.memPoolIds();
    try { return await this.client!.smembers('matching_pool'); } catch { return this.memPoolIds(); }
  }

  async getMatchingData(userId: string): Promise<any | null> {
    if (!this.isReady()) return this.memPoolGet(userId);
    try {
      const data = await this.client!.get(`matching:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch { return this.memPoolGet(userId); }
  }

  private memPoolGet(userId: string): any | null {
    const entry = this.memMatchingPool.get(userId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.memMatchingPool.delete(userId); return null; }
    return entry.data;
  }

  private memPoolIds(): string[] {
    const now = Date.now();
    return Array.from(this.memMatchingPool.entries())
      .filter(([, entry]) => entry.expiresAt >= now)
      .map(([id]) => id);
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
