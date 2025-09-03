import {
  DefaultDescription,
  Description,
  ICustomShortcut,
  ICustomShortcutDto,
} from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class CustomShortcut extends DatabaseEntity implements ICustomShortcut {
  name: string;

  shortcut: Description = DefaultDescription();

  constructor(entity: Partial<ICustomShortcut>) {
    super(entity);
    Object.assign(this, entity);
  }

  public toObject(): ICustomShortcut {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ICustomShortcut;
  }

  public toDTO(): ICustomShortcutDto {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ICustomShortcutDto;
  }
}
