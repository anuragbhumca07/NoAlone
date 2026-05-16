import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportUserDto {
  @ApiProperty()
  @IsUUID()
  reportedUserId: string;

  @ApiProperty({ enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'OTHER'] })
  @IsEnum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'OTHER'])
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
