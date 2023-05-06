import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core';
import { ITagGroup, TagGroupDto, Tag } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class TagGroup extends PostyBirbEntity implements ITagGroup {
  [EntityRepositoryType]?: PostyBirbRepository<TagGroup>;

  /** @inheritdoc */
  @Property({ unique: true, type: 'string', nullable: false })
  name: string;

  /** @inheritdoc */
  @Property({ type: 'array', default: [], nullable: false })
  tags: Tag[];

  toJson(): TagGroupDto {
    return {
      ...super.toJson(),
      name: this.name,
      tags: [...this.tags],
    };
  }
}
