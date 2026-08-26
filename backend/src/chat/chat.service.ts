import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';
import { SendMessageDto, CreateConversationDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService, private moderationService: ModerationService) {}

  async getOrCreateConversation(userId: string, dto: CreateConversationDto) {
    // message:send already checks this before ever reaching here, so this
    // is a no-op for that path — but POST /chat/conversations (used when
    // starting a chat from search) never did, letting a blocked user create
    // a conversation row with the person who blocked them. It couldn't
    // actually send anything into it (message:send's own check stops that),
    // but it would still show up as an empty "someone tried to reach you"
    // entry in the blocker's chat list.
    const blocked = await this.moderationService.isBlocked(userId, dto.targetUserId).catch(() => false);
    if (blocked) throw new ForbiddenException('This user is unavailable.');

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
    // The socket gateway passes the raw payload through untyped, bypassing the
    // REST DTO's class-validator pipe — enforce the length cap here too.
    if (dto.content && dto.content.length > 10000) {
      throw new BadRequestException('Message content exceeds 10,000 characters');
    }

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

  // PRIVATE rooms aren't listed anywhere (see RoomsService.findAll), so their
  // id is the only thing standing between a non-member and the room's
  // content — without this, any authenticated user who ever saw that id
  // (a shared link, a log line, browser history) could read and post into
  // it forever without ever actually joining. PUBLIC rooms stay open to
  // read/post without membership, matching the "browsable" design.
  async assertRoomAccess(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type === 'PRIVATE') {
      const member = await this.prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
      if (!member) throw new ForbiddenException('Not a member of this room');
    }
  }

  async canAccessRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      await this.assertRoomAccess(roomId, userId);
      return true;
    } catch {
      return false;
    }
  }

  async saveRoomMessage(senderId: string, data: { roomId: string; content: string; type?: string }) {
    await this.assertRoomAccess(data.roomId, senderId);
    if (data.content && data.content.length > 10000) {
      throw new BadRequestException('Message content exceeds 10,000 characters');
    }

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
