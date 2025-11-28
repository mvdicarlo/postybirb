import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LegacyImportDto {
  @IsBoolean()
  tagGroups: boolean;

  @IsBoolean()
  accounts: boolean;

  @IsBoolean()
  tagConverters: boolean;

  @IsOptional()
  @IsString()
  customPath?: string;
}
