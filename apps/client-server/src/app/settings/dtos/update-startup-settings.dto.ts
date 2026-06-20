import { ApiProperty } from '@nestjs/swagger';
import { StartupOptions } from '@postybirb/utils/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpdateProxyConfigurationDto } from './update-proxy-settings.dto';

export class UpdateStartupSettingsDto implements StartupOptions {
  @ApiProperty()
  @IsOptional()
  @IsString()
  appDataPath: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  port: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  startAppOnSystemStartup: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  spellchecker: boolean;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProxyConfigurationDto)
  proxy: UpdateProxyConfigurationDto;
}
