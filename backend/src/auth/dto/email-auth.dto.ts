import { IsEmail, IsString, MinLength, MaxLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class EmailVerifyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class EmailLoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MaxLength(128)
  password: string;
}

export class GoogleMobileDto {
  @ApiProperty({ description: 'Google OAuth access token from mobile sign-in' })
  @IsString()
  @MaxLength(4096)
  accessToken: string;
}

export class SupabaseSyncDto {
  @ApiProperty({ description: 'Supabase session access token from the client' })
  @IsString()
  @MaxLength(4096)
  accessToken: string;
}
