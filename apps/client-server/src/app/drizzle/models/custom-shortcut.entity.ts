import {
    DefaultDescriptionValue,
    DescriptionValue,
    ICustomShortcut
} from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class CustomShortcut
  extends DatabaseEntity
  implements ICustomShortcut
{
  name: string;

  inline = false;

  shortcut: DescriptionValue = DefaultDescriptionValue();

  constructor(entity: Partial<ICustomShortcut>) {
    super(entity);
    Object.assign(this, entity);
  }

  public toObject(): ICustomShortcut {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ICustomShortcut;
  }

  public toDTO(): ICustomShortcut {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ICustomShortcut;
  }
}
