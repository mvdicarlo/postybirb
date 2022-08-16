import {
  BaseEntity as BaseMikroOrmEntity,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { v4 } from 'uuid';

export abstract class BaseEntity<
  T,
  PK extends keyof T,
  P extends string = never
> extends BaseMikroOrmEntity<T, PK, P> {
  @PrimaryKey()
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
