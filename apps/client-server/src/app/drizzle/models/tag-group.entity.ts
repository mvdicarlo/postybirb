import { ITagGroup, TagGroupDto } from '@postybirb/types';
import { instanceToPlain, plainToClass } from 'class-transformer';
import { tagGroup } from '../schemas';
import { DatabaseEntity } from './database-entity';

export class TagGroup extends DatabaseEntity implements ITagGroup {
  name: string;

  tags: string[] = [];

  toObject(): ITagGroup {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ITagGroup;
  }

  toDTO(): TagGroupDto {
    return this.toObject() as unknown as TagGroupDto;
  }

  static fromDBO(entity: typeof tagGroup.$inferSelect): TagGroup {
    return plainToClass(TagGroup, entity, { enableCircularCheck: true });
  }
}
