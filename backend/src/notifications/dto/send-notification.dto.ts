import { IsString, IsOptional, IsObject } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
