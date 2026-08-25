import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ required: false, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  type?: 'PUBLIC' | 'PRIVATE';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
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
