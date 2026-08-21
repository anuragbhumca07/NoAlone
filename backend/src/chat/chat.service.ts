import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto, CreateConversationDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userId: string, dto: CreateConversationDto) {
    const [user1Id, user2Id] = [userId, dto.targetUserId].sort();

    let conversation = await this.prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
        user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { user1Id, user2Id },
        include: {
          user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
          user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
        },
      });
    }

    return conversation;
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
        user2: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, avatarConfig: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conv) => ({
      ...conv,
      otherUser: conv.user1Id === userId ? conv.user2 : conv.user1,
      lastMessage: conv.messages[0] || null,
    }));
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 30) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async saveMessage(senderId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation || (conversation.user1Id !== senderId && conversation.user2Id !== senderId)) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        content: dto.content || null,
        type: dto.type || 'TEXT',
        mediaUrl: dto.mediaUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async saveRoomMessage(senderId: string, data: { roomId: string; content: string; type?: string }) {
    return this.prisma.message.create({
      data: {
        roomId: data.roomId,
        senderId,
        content: data.content,
        type: (data.type as any) || 'TEXT',
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, avatarConfig: true } },
      },
    });
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Marks a message as delivered (the recipient's client received it over
   * the socket) and returns who to notify — null if the message doesn't
   * exist, the caller is the sender (can't deliver to yourself), or it was
   * already marked delivered (avoid redundant broadcasts).
   */
  async markDelivered(messageId: string, recipientId: string): Promise<{ senderId: string; conversationId: string | null } | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true, deliveredAt: true },
    });
    if (!message || message.senderId === recipientId || message.deliveredAt) return null;

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deliveredAt: new Date() },
    });
    return { senderId: message.senderId, conversationId: message.conversationId };
  }

  async getUnreadCount(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });

    const counts = await Promise.all(
      conversations.map(async (conv) => {
        const count = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
        return { conversationId: conv.id, count };
      }),
    );

    return counts.filter((c) => c.count > 0);
  }
}
