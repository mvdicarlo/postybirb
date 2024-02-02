import { PrimaryKey, Property, Unique, serialize } from '@mikro-orm/core';
import { IEntity, IEntityDto } from '@postybirb/types';
import { v4 } from 'uuid';

/** @inheritdoc */
export abstract class PostyBirbEntity implements IEntity {
  /** @inheritdoc */
  @PrimaryKey()
  @Unique()
  id: string = v4();

  /** @inheritdoc */
  @Property({
    serializer: (value) => value.toISOString(),
  })
  createdAt: Date = new Date();

  /** @inheritdoc */
  @Property({
    onUpdate: () => new Date(),
    serializer: (value) => value.toISOString(),
  })
  updatedAt: Date = new Date();

  toJSON(): IEntityDto {
    return serialize(this) as IEntityDto;
  }
}
