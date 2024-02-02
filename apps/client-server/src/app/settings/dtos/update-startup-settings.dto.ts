import { ApiProperty } from '@nestjs/swagger';
import { StartupOptions } from '@postybirb/utils/electron';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
}
