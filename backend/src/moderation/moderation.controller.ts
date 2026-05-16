import { Controller, Post, Delete, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { ReportUserDto } from './dto/report-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post('report')
  @ApiOperation({ summary: 'Report a user' })
  report(@Req() req: any, @Body() dto: ReportUserDto) {
    return this.moderationService.reportUser(req.user.id, dto);
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  block(@Req() req: any, @Body() dto: BlockUserDto) {
    return this.moderationService.blockUser(req.user.id, dto);
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  unblock(@Req() req: any, @Param('userId') userId: string) {
    return this.moderationService.unblockUser(req.user.id, userId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get blocked users list' })
  getBlocked(@Req() req: any) {
    return this.moderationService.getBlockedUsers(req.user.id);
  }
}
