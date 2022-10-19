import {
  AnyEntity,
  BaseEntity as BaseMikroOrmEntity,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { IBaseEntity } from '@postybirb/types';
import { v4 } from 'uuid';

export abstract class BaseEntity<T extends IBaseEntity = IBaseEntity>
  extends BaseMikroOrmEntity<T, 'id', never>
  implements IBaseEntity, AnyEntity<IBaseEntity>
{
  @PrimaryKey()
  @Unique()
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  markedForDeletion = false;

  constructor(props?: Partial<T>) {
    super();
    if (props) {
      Object.assign(this, props);
    }
  }
}
