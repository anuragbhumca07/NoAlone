import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportUserDto } from './dto/report-user.dto';
import { BlockUserDto } from './dto/block-user.dto';

// Simple profanity filter
const BANNED_WORDS = ['spam', 'scam']; // Add real list in production

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  filterProfanity(text: string): string {
    let filtered = text;
    BANNED_WORDS.forEach((word) => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
  }

  containsProfanity(text: string): boolean {
    return BANNED_WORDS.some((word) => text.toLowerCase().includes(word.toLowerCase()));
  }

  async reportUser(reporterId: string, dto: ReportUserDto) {
    const reported = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
    if (!reported) throw new NotFoundException('User not found');

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedUserId,
        reason: dto.reason as any,
        description: dto.description,
      },
    });
  }

  async blockUser(blockerId: string, dto: BlockUserDto) {
    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId: dto.blockedUserId } },
    });
    if (existing) throw new ConflictException('Already blocked');

    return this.prisma.block.create({
      data: { blockerId, blockedId: dto.blockedUserId },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    return blocks.map((b) => b.blocked);
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });
    return !!block;
  }

  // Admin: get pending reports
  async getPendingReports() {
    return this.prisma.report.findMany({
      where: { status: 'PENDING' },
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        reported: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async banUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });
  }

  async reviewReport(reportId: string, status: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: status as any },
    });
  }
}
