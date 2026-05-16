import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        age: true,
        gender: true,
        language: true,
        interests: true,
        isOnline: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username, NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('Username already taken');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        age: true,
        gender: true,
        language: true,
        interests: true,
        isVerified: true,
      },
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
    });
    const blockedIds = blocks.map((b) => (b.blockerId === currentUserId ? b.blockedId : b.blockerId));

    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: [...blockedIds, currentUserId] } },
          { isBanned: false },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        isVerified: true,
      },
      take: 20,
    });
  }

  async getOnlineUsers(currentUserId: string) {
    const onlineIds = await this.redis.getOnlineUsers();
    if (!onlineIds.length) return [];

    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
    });
    const blockedIds = blocks.map((b) => (b.blockerId === currentUserId ? b.blockedId : b.blockerId));

    return this.prisma.user.findMany({
      where: {
        id: { in: onlineIds.filter((id) => id !== currentUserId && !blockedIds.includes(id)) },
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        language: true,
        interests: true,
        age: true,
        gender: true,
      },
    });
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: new Date() },
    });
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }
}
