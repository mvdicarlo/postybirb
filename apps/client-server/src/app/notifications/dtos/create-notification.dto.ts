import { ApiProperty } from '@nestjs/swagger';
import { ICreateNotificationDto } from '@postybirb/types';
import { IsArray, IsObject, IsString } from 'class-validator';

export class CreateNotificationDto implements ICreateNotificationDto {
  @ApiProperty()
  @IsObject()
  data: Record<string, unknown> = {};

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  tags: string[] = [];

  @ApiProperty()
  @IsString()
  type: 'warning' | 'error' | 'info' | 'success' = 'info';
}
