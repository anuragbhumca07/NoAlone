import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
}

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiProperty({ required: false, enum: MessageTypeEnum })
  @IsOptional()
  @IsEnum(MessageTypeEnum)
  type?: MessageTypeEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  fileSize?: number;
}

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}
