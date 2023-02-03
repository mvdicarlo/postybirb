import { Entity, Property } from '@mikro-orm/core';
import { ITagGroup } from '@postybirb/types';
import { BaseEntity } from './base.entity';

@Entity()
export class TagGroup extends BaseEntity<TagGroup> implements ITagGroup {
  @Property({ type: 'string', nullable: false })
  name: string;

  @Property({ type: 'array', default: [], nullable: false })
  tags: string[];
}
