import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from '../chat/dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateRoomDto) {
    const room = await this.prisma.room.create({
      data: {
        ...dto,
        createdById: userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } },
    });
    return room;
  }

  async findAll(filters: { language?: string; topic?: string; isLive?: boolean }) {
    return this.prisma.room.findMany({
      where: {
        type: 'PUBLIC',
        ...(filters.language ? { language: filters.language } : {}),
        ...(filters.topic ? { topic: filters.topic } : {}),
        ...(filters.isLive !== undefined ? { isLive: filters.isLive } : {}),
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: [{ isLive: 'desc' }, { updatedAt: 'desc' }],
      take: 50,
    });
  }

  async findById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } },
        },
        _count: { select: { members: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async join(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const memberCount = await this.prisma.roomMember.count({ where: { roomId } });
    if (memberCount >= room.maxMembers) {
      throw new BadRequestException('Room is full');
    }

    const existing = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!existing) {
      await this.prisma.roomMember.create({ data: { roomId, userId } });
    }

    return this.findById(roomId);
  }

  async leave(roomId: string, userId: string) {
    await this.prisma.roomMember.deleteMany({ where: { roomId, userId } });
    return { success: true };
  }

  async getMessages(roomId: string, cursor?: string, limit = 50) {
    return this.prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async setLive(roomId: string, userId: string, isLive: boolean) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, role: { in: ['owner', 'moderator'] } },
    });
    if (!member) throw new ForbiddenException('Not authorized');

    return this.prisma.room.update({
      where: { id: roomId },
      data: { isLive },
    });
  }

  async getUserRooms(userId: string) {
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: { _count: { select: { members: true } } },
        },
      },
    });
    return memberships.map((m) => m.room);
  }
}
