import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
  ) {}

  async joinPool(userId: string, preferences: { language?: string; ageGroup?: string; interests?: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, language: true, age: true, interests: true, displayName: true, avatarUrl: true },
    });

    await this.redis.addToMatchingPool(userId, {
      userId,
      language: preferences.language || user.language,
      ageGroup: preferences.ageGroup,
      interests: preferences.interests || user.interests,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      joinedAt: Date.now(),
    });

    return { status: 'searching', message: 'Added to matching pool' };
  }

  async leavePool(userId: string) {
    await this.redis.removeFromMatchingPool(userId);
    return { status: 'left', message: 'Removed from matching pool' };
  }

  async findMatch(userId: string): Promise<{ matched: boolean; user?: any; conversationId?: string }> {
    const pool = await this.redis.getMatchingPool();
    const myData = await this.redis.getMatchingData(userId);

    if (!myData) return { matched: false };

    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedIds = new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)));

    // Find best match
    const candidates = pool.filter((id) => id !== userId && !blockedIds.has(id));

    if (!candidates.length) return { matched: false };

    // Simple scoring: same language gets priority, then common interests
    let bestMatch = null;
    let bestScore = -1;

    for (const candidateId of candidates) {
      const candidateData = await this.redis.getMatchingData(candidateId);
      if (!candidateData) continue;

      let score = 0;
      if (candidateData.language === myData.language) score += 10;
      if (myData.interests && candidateData.interests) {
        const common = myData.interests.filter((i: string) => candidateData.interests.includes(i));
        score += common.length * 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { id: candidateId, data: candidateData };
      }
    }

    if (!bestMatch) return { matched: false };

    // Remove both from pool
    await this.redis.removeFromMatchingPool(userId);
    await this.redis.removeFromMatchingPool(bestMatch.id);

    // Create or get conversation
    const [user1Id, user2Id] = [userId, bestMatch.id].sort();
    let conversation = await this.prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { user1Id, user2Id },
      });
    }

    // Create match record
    await this.prisma.match.create({
      data: { requesterId: userId, receiverId: bestMatch.id, status: 'accepted' },
    });

    return {
      matched: true,
      user: {
        id: bestMatch.data.userId,
        displayName: bestMatch.data.displayName,
        avatarUrl: bestMatch.data.avatarUrl,
      },
      conversationId: conversation.id,
    };
  }

  async getMatches(userId: string) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: 'accepted',
      },
      include: {
        requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
