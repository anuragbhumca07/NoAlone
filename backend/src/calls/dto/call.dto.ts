import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CallType } from '@prisma/client';

export class InitiateCallDto {
  @ApiProperty({ description: 'ID of the user being called' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ enum: CallType, default: 'VOICE' })
  @IsEnum(CallType)
  callType: CallType;
}

export class AuthorizeCallsDto {
  @ApiProperty({ description: 'OAuth authorization code from Google' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Redirect URI used in the OAuth request' })
  @IsString()
  redirectUri: string;
}
