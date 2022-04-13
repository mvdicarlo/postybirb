import { ApiProperty } from '@nestjs/swagger';
import { ISettingsOptions, IUpdateSettingsDto } from '@postybirb/dto';
import { IsObject, IsString } from 'class-validator';

/**
 * Settings update request object.
 */
export class UpdateSettingsDto implements IUpdateSettingsDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsObject()
  settings: ISettingsOptions;
}
