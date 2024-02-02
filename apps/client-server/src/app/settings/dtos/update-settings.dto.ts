import { ApiProperty } from '@nestjs/swagger';
import { ISettingsOptions, IUpdateSettingsDto } from '@postybirb/types';
import { IsObject } from 'class-validator';

/**
 * Settings update request object.
 */
export class UpdateSettingsDto implements IUpdateSettingsDto {
  @ApiProperty()
  @IsObject()
  settings: ISettingsOptions;
}
