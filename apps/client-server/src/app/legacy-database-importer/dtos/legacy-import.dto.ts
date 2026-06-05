import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LegacyImportDto {
  @IsBoolean()
  customShortcuts: boolean;

  @IsBoolean()
  tagGroups: boolean;

  @IsBoolean()
  accounts: boolean;

  @IsBoolean()
  tagConverters: boolean;

  @IsBoolean()
  submissions: boolean;

  @IsBoolean()
  templates: boolean;

  @IsOptional()
  @IsString()
  customPath?: string;
}
