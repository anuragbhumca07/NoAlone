import {
  Controller, Post, Get, Body, Param, UseGuards, Req, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { InitiateCallDto, AuthorizeCallsDto } from './dto/call.dto';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(
    private callsService: CallsService,
    private callsGateway: CallsGateway,
  ) {}

  /** Check if caller has Google Calendar authorization */
  @Get('authorize-status')
  @ApiOperation({ summary: 'Check Google Calendar authorization status' })
  getAuthorizeStatus(@Req() req: any) {
    return this.callsService.getAuthorizeStatus(req.user.id);
  }

  /** Exchange OAuth code for Calendar tokens and store them */
  @Post('authorize')
  @ApiOperation({ summary: 'Authorize Google Calendar access for Meet link generation' })
  authorize(@Req() req: any, @Body() dto: AuthorizeCallsDto) {
    return this.callsService.authorizeGoogle(req.user.id, dto.code, dto.redirectUri);
  }

  /** Create a Meet link and initiate a call */
  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a voice or video call' })
  initiate(@Req() req: any, @Body() dto: InitiateCallDto) {
    return this.callsService.initiateCall(
      req.user.id,
      dto,
      (userId, event, data) => this.callsGateway.emitToUser(userId, event, data),
    );
  }

  /** Accept an incoming call */
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept an incoming call' })
  accept(@Req() req: any, @Param('id') callId: string) {
    return this.callsService.acceptCall(
      req.user.id,
      callId,
      (userId, event, data) => this.callsGateway.emitToUser(userId, event, data),
    );
  }

  /** Decline an incoming call */
  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an incoming call' })
  decline(@Req() req: any, @Param('id') callId: string) {
    return this.callsService.declineCall(
      req.user.id,
      callId,
      (userId, event, data) => this.callsGateway.emitToUser(userId, event, data),
    );
  }

  /** Cancel an outgoing call (caller hangs up before answer) */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an outgoing call' })
  cancel(@Req() req: any, @Param('id') callId: string) {
    return this.callsService.cancelCall(
      req.user.id,
      callId,
      (userId, event, data) => this.callsGateway.emitToUser(userId, event, data),
    );
  }

  /** End an active call */
  @Post(':id/end')
  @ApiOperation({ summary: 'End an active call' })
  end(@Req() req: any, @Param('id') callId: string) {
    return this.callsService.endCall(
      req.user.id,
      callId,
      (userId, event, data) => this.callsGateway.emitToUser(userId, event, data),
    );
  }

  /** Get call history for current user */
  @Get('history')
  @ApiOperation({ summary: 'Get paginated call history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getHistory(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.callsService.getCallHistory(req.user.id, +page, +limit);
  }
}
