import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false, enum: MessageTypeEnum })
  @IsOptional()
  @IsEnum(MessageTypeEnum)
  type?: MessageTypeEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}
