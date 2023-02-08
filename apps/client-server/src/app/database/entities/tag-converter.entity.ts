import { Entity, Property } from '@mikro-orm/core';
import { ITagConverter } from '@postybirb/types';
import { BaseEntity } from './base.entity';

@Entity()
export class TagConverter
  extends BaseEntity<ITagConverter>
  implements ITagConverter
{
  @Property({ unique: true, nullable: false })
  tag: string;

  @Property({ type: 'json' })
  convertTo: Record<string, string>;
}
