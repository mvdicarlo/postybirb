import { ICreateCustomShortcutDto } from '@postybirb/types';
import { IsString } from 'class-validator';

export class CreateCustomShortcutDto implements ICreateCustomShortcutDto {
  @IsString()
  name: string;
}
