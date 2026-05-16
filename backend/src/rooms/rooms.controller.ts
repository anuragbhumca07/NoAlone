import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from '../chat/dto/create-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsBoolean, IsOptional } from 'class-validator';

class SetLiveDto {
  @IsBoolean()
  isLive: boolean;
}

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a room' })
  create(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms' })
  findAll(
    @Query('language') language?: string,
    @Query('topic') topic?: string,
    @Query('isLive') isLive?: string,
  ) {
    return this.roomsService.findAll({
      language,
      topic,
      isLive: isLive !== undefined ? isLive === 'true' : undefined,
    });
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my rooms' })
  getMyRooms(@Req() req: any) {
    return this.roomsService.getUserRooms(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a room' })
  join(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.join(id, req.user.id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a room' })
  leave(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.leave(id, req.user.id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get room messages' })
  getMessages(@Param('id') id: string, @Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.roomsService.getMessages(id, cursor, limit);
  }

  @Patch(':id/live')
  @ApiOperation({ summary: 'Set room live status' })
  setLive(@Req() req: any, @Param('id') id: string, @Body() dto: SetLiveDto) {
    return this.roomsService.setLive(id, req.user.id, dto.isLive);
  }
}
