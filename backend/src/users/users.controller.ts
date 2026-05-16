import { Controller, Get, Patch, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  search(@Req() req: any, @Query('q') query: string) {
    return this.usersService.searchUsers(query || '', req.user.id);
  }

  @Get('online')
  @ApiOperation({ summary: 'Get online users' })
  getOnline(@Req() req: any) {
    return this.usersService.getOnlineUsers(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
