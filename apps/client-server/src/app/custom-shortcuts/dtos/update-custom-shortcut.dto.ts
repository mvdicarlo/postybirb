import { Description, IUpdateCustomShortcutDto } from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

export class UpdateCustomShortcutDto implements IUpdateCustomShortcutDto {
  @IsString()
  name: string;

  @IsObject()
  shortcut: Description;
}
