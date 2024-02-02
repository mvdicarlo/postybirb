import {
  Entity,
  EntityRepositoryType,
  Property,
  serialize,
} from '@mikro-orm/core';
import { ITagConverter, TagConverterDto } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class TagConverter extends PostyBirbEntity implements ITagConverter {
  [EntityRepositoryType]?: PostyBirbRepository<TagConverter>;

  @Property({ unique: true, nullable: false })
  tag: string;

  @Property({ type: 'json' })
  convertTo: Record<string, string>;

  toJSON(): TagConverterDto {
    return serialize(this) as TagConverterDto;
  }
}
