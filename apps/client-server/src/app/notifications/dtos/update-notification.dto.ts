import { ApiProperty } from '@nestjs/swagger';
import { IUpdateNotificationDto } from '@postybirb/types';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationDto implements IUpdateNotificationDto {
  @ApiProperty()
  @IsBoolean()
  isRead: boolean;

  @ApiProperty()
  @IsBoolean()
  hasEmitted: boolean;
}
