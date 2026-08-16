import { Controller, Get, Put, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsObject, MaxLength, MinLength } from 'class-validator';
import { AiCompanionService } from './ai-companion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class UpdateCompanionDto {
  @IsOptional() @IsString() @MaxLength(30) name?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']) gender?: string;
  @IsOptional() @IsObject() outfit?: Record<string, any>;
}

class SendAiMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) content: string;
}

@ApiTags('AI Companion')
@Controller('ai-companion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiCompanionController {
  constructor(private aiCompanionService: AiCompanionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get (or create) your AI companion config' })
  getMe(@Req() req: any) {
    return this.aiCompanionService.getOrCreate(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Customize your AI companion' })
  update(@Req() req: any, @Body() dto: UpdateCompanionDto) {
    return this.aiCompanionService.update(req.user.id, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get AI companion chat history' })
  getMessages(@Req() req: any) {
    return this.aiCompanionService.getMessages(req.user.id);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to your AI companion, get an instant reply' })
  sendMessage(@Req() req: any, @Body() dto: SendAiMessageDto) {
    return this.aiCompanionService.sendMessage(req.user.id, dto.content);
  }

  @Delete('messages')
  @ApiOperation({ summary: 'Clear AI companion chat history' })
  clear(@Req() req: any) {
    return this.aiCompanionService.clearHistory(req.user.id);
  }
}
