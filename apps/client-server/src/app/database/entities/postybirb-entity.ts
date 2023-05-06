import { PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { IEntity, IEntityDto } from '@postybirb/types';
import { v4 } from 'uuid';

/** @inheritdoc */
export abstract class PostyBirbEntity implements IEntity {
  /** @inheritdoc */
  @PrimaryKey()
  @Unique()
  id: string = v4();

  /** @inheritdoc */
  @Property()
  createdAt: Date = new Date();

  /** @inheritdoc */
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  toJson(): IEntityDto {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
