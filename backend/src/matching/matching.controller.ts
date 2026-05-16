import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOptional, IsString, IsArray } from 'class-validator';

class JoinPoolDto {
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() ageGroup?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
}

@ApiTags('Matching')
@Controller('matching')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join matching pool' })
  joinPool(@Req() req: any, @Body() dto: JoinPoolDto) {
    return this.matchingService.joinPool(req.user.id, dto);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Leave matching pool' })
  leavePool(@Req() req: any) {
    return this.matchingService.leavePool(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get match history' })
  getMatches(@Req() req: any) {
    return this.matchingService.getMatches(req.user.id);
  }
}
