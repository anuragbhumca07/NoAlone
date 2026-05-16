import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  type?: 'PUBLIC' | 'PRIVATE';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ required: false, default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(200)
  maxMembers?: number;
}
