import { Description, IUpdateCustomShortcutDto } from '@postybirb/types';
import { IsArray, IsString } from 'class-validator';

export class UpdateCustomShortcutDto implements IUpdateCustomShortcutDto {
  @IsString()
  name: string;

  @IsArray()
  shortcut: Description;
}
