import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateReply } from './reply-engine';

const DEFAULT_OUTFIT = { skinTone: '#f1c27d', hairStyle: 'short', hairColor: '#3a2313', outfitStyle: 'tee', outfitColor: '#7c5cff', accessory: 'none', bgColor: '#ece9ff' };

@Injectable()
export class AiCompanionService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.aiCompanion.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.aiCompanion.create({
      data: { userId, name: 'Alex', gender: 'OTHER', outfit: DEFAULT_OUTFIT },
    });
  }

  async update(userId: string, patch: { name?: string; gender?: string; outfit?: object }) {
    const companion = await this.getOrCreate(userId);
    return this.prisma.aiCompanion.update({
      where: { id: companion.id },
      data: {
        name: patch.name ?? undefined,
        gender: (patch.gender as any) ?? undefined,
        outfit: patch.outfit ?? undefined,
      },
    });
  }

  async getMessages(userId: string) {
    const companion = await this.getOrCreate(userId);
    return this.prisma.aiChatMessage.findMany({
      where: { companionId: companion.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(userId: string, content: string) {
    const companion = await this.getOrCreate(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });

    const userMessage = await this.prisma.aiChatMessage.create({
      data: { companionId: companion.id, role: 'USER', content },
    });

    const replyText = generateReply(content, {
      companionName: companion.name,
      userName: user?.displayName || 'friend',
    });

    const aiMessage = await this.prisma.aiChatMessage.create({
      data: { companionId: companion.id, role: 'AI', content: replyText },
    });

    return { userMessage, aiMessage };
  }

  async clearHistory(userId: string) {
    const companion = await this.getOrCreate(userId);
    await this.prisma.aiChatMessage.deleteMany({ where: { companionId: companion.id } });
    return { success: true };
  }
}
