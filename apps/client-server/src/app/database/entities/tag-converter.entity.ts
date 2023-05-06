import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core';
import { ITagConverter, ITagConverterDto } from '@postybirb/types';
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

  toJson(): ITagConverterDto {
    return {
      ...super.toJson(),
      tag: this.tag,
      convertTo: { ...this.convertTo },
    };
  }
}
