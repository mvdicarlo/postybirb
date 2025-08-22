import { DescriptionValue, IUpdateCustomShortcutDto } from '@postybirb/types';
import { IsBoolean, IsObject, IsString } from 'class-validator';

export class UpdateCustomShortcutDto implements IUpdateCustomShortcutDto {
  @IsString()
  name: string;

  @IsBoolean()
  inline: boolean;

  @IsObject()
  shortcut: DescriptionValue;
}
