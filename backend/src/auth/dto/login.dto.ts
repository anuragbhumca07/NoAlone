import { IsString, MaxLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(20)
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code: string;
}

export class GoogleAuthDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  accessToken: string;
}
