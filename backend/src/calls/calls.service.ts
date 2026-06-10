import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MeetService } from './meet.service';
import { InitiateCallDto } from './dto/call.dto';
import { CallStatus, CallType } from '@prisma/client';

const RING_TIMEOUT_SEC = parseInt(process.env.CALL_RING_TIMEOUT_SECONDS || '30', 10);

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private meetService: MeetService,
  ) {}

  /** POST /api/v1/calls/authorize-status — check if caller has Google Calendar auth */
  async getAuthorizeStatus(callerId: string): Promise<{ isAuthorized: boolean }> {
    const authorized = await this.meetService.isUserAuthorized(callerId);
    return { isAuthorized: authorized };
  }

  /** POST /api/v1/calls/authorize — exchange OAuth code for Calendar tokens */
  async authorizeGoogle(callerId: string, code: string, redirectUri: string): Promise<{ success: boolean }> {
    const tokens = await this.meetService.exchangeCodeForTokens(code, redirectUri);
    await this.meetService.storeTokens(
      callerId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn * 1000,
    );
    return { success: true };
  }

  /** POST /api/v1/calls/initiate */
  async initiateCall(
    callerId: string,
    dto: InitiateCallDto,
    emitToReceiver: (receiverId: string, event: string, data: any) => void,
  ): Promise<any> {
    const [caller, receiver] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: callerId },
        select: { id: true, displayName: true, avatarUrl: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.receiverId },
        select: { id: true, displayName: true, fcmToken: true },
      }),
    ]);

    if (!receiver) throw new NotFoundException('User not found');

    // Generate Meet link (requires Google Calendar auth)
    const meetResult = await this.meetService.createMeetLink(callerId);

    // Create call record
    const call = await this.prisma.call.create({
      data: {
        callerId,
        receiverId: dto.receiverId,
        meetLink: meetResult.meetLink,
        meetCode: meetResult.meetCode,
        callType: dto.callType,
        expiresAt: meetResult.expiresAt,
        status: CallStatus.RINGING,
      },
    });

    const callPayload = {
      callId: call.id,
      callerId,
      callerName: caller?.displayName || 'Someone',
      callerAvatar: caller?.avatarUrl || null,
      callType: dto.callType,
      meetLink: meetResult.meetLink,
    };

    // Emit via Socket.IO to receiver
    emitToReceiver(dto.receiverId, 'call:incoming', callPayload);

    // Send push notification for background
    await this.notificationsService.sendToUser(dto.receiverId, {
      title: `${caller?.displayName || 'Someone'} is calling...`,
      body: `${dto.callType === CallType.VIDEO ? 'Video' : 'Voice'} call — tap to answer`,
      data: {
        type: 'INCOMING_CALL',
        callId: call.id,
        callerId,
        callerName: caller?.displayName || '',
        callerAvatar: caller?.avatarUrl || '',
        callType: dto.callType,
        meetLink: meetResult.meetLink,
      },
    });

    // Auto-cancel after ring timeout
    setTimeout(async () => {
      const latest = await this.prisma.call.findUnique({ where: { id: call.id }, select: { status: true } });
      if (latest?.status === CallStatus.RINGING) {
        await this.prisma.call.update({
          where: { id: call.id },
          data: { status: CallStatus.MISSED, endedAt: new Date() },
        });
        emitToReceiver(dto.receiverId, 'call:cancelled', { callId: call.id });
        emitToReceiver(callerId, 'call:missed', { callId: call.id });
        this.logger.log(`Call ${call.id} auto-cancelled (no answer)`);
      }
    }, RING_TIMEOUT_SEC * 1000);

    return { call, meetLink: meetResult.meetLink };
  }

  /** POST /api/v1/calls/:id/accept */
  async acceptCall(
    receiverId: string,
    callId: string,
    emitToCaller: (callerId: string, event: string, data: any) => void,
  ): Promise<{ meetLink: string }> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.receiverId !== receiverId) throw new ForbiddenException();
    if (call.status !== CallStatus.RINGING) throw new ForbiddenException('Call is no longer active');

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ACCEPTED, answeredAt: new Date() },
    });

    emitToCaller(call.callerId, 'call:accepted', { callId, meetLink: call.meetLink });
    return { meetLink: updated.meetLink || '' };
  }

  /** POST /api/v1/calls/:id/decline */
  async declineCall(
    receiverId: string,
    callId: string,
    emitToCaller: (callerId: string, event: string, data: any) => void,
  ): Promise<{ success: boolean }> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.receiverId !== receiverId) throw new ForbiddenException();

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.DECLINED, endedAt: new Date() },
    });

    emitToCaller(call.callerId, 'call:declined', { callId });
    return { success: true };
  }

  /** POST /api/v1/calls/:id/cancel */
  async cancelCall(
    callerId: string,
    callId: string,
    emitToReceiver: (receiverId: string, event: string, data: any) => void,
  ): Promise<{ success: boolean }> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.callerId !== callerId) throw new ForbiddenException();

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.MISSED, endedAt: new Date() },
    });

    emitToReceiver(call.receiverId, 'call:cancelled', { callId });
    return { success: true };
  }

  /** POST /api/v1/calls/:id/end */
  async endCall(
    userId: string,
    callId: string,
    emitToOther: (otherId: string, event: string, data: any) => void,
  ): Promise<{ success: boolean }> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.callerId !== userId && call.receiverId !== userId) throw new ForbiddenException();

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    });

    const otherId = call.callerId === userId ? call.receiverId : call.callerId;
    emitToOther(otherId, 'call:ended', { callId });
    return { success: true };
  }

  /** GET /api/v1/calls/history */
  async getCallHistory(userId: string, page = 1, limit = 20): Promise<any[]> {
    const calls = await this.prisma.call.findMany({
      where: { OR: [{ callerId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        receiver: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      },
    });

    return calls.map((call) => ({
      ...call,
      direction: call.callerId === userId ? 'outgoing' : 'incoming',
      otherUser: call.callerId === userId ? call.receiver : call.caller,
      durationSeconds:
        call.answeredAt && call.endedAt
          ? Math.round((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000)
          : null,
    }));
  }
}
