import {
  BaseEntity as BaseMikroOrmEntity,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { IBaseEntity } from '@postybirb/types';
import { v4 } from 'uuid';

export abstract class BaseEntity<
    T,
    PK extends keyof T,
    P extends string = never
  >
  extends BaseMikroOrmEntity<T, PK, P>
  implements IBaseEntity
{
  @PrimaryKey()
  @Unique()
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  constructor(props?: Partial<T>) {
    super();
    if (props) {
      Object.assign(this, props);
    }
  }
}
