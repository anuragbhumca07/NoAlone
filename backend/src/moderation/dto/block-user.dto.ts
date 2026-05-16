import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty()
  @IsUUID()
  blockedUserId: string;
}
