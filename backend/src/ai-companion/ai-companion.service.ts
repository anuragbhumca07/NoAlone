import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateReply } from './reply-engine';

const DEFAULT_OUTFIT = { skinTone: '#f1c27d', hairStyle: 'short', hairColor: '#3a2313', outfitStyle: 'tee', outfitColor: '#7c5cff', accessory: 'none', bgColor: '#ece9ff' };

@Injectable()
export class AiCompanionService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    try {
      return await this.prisma.aiCompanion.upsert({
        where: { userId },
        update: {},
        create: { userId, name: 'Alex', gender: 'OTHER', outfit: DEFAULT_OUTFIT },
      });
    } catch (e) {
      // Two concurrent first-time requests (e.g. the AI Buddy page firing
      // getMe + getMessages together) can both miss the upsert's own
      // conflict check and race on the create; the loser just re-reads
      // the row the winner created.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.aiCompanion.findUniqueOrThrow({ where: { userId } });
      }
      throw e;
    }
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
