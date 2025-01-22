import { EntityPrimitive, ITagGroup, TagGroupDto } from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class TagGroup extends DatabaseEntity implements ITagGroup {
  name: string;

  tags: string[] = [];

  toObject(): EntityPrimitive<ITagGroup> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<ITagGroup>;
  }

  toDTO(): TagGroupDto {
    return this.toObject() as unknown as TagGroupDto;
  }
}
