import {
  BaseEntity as BaseMikroOrmEntity,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { BaseEntityType } from '../models/base-entity';

export abstract class BaseEntity<
    T,
    PK extends keyof T,
    P extends string = never
  >
  extends BaseMikroOrmEntity<T, PK, P>
  implements BaseEntityType
{
  @PrimaryKey()
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
