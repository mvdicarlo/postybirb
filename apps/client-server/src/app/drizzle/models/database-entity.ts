import { IEntity, IEntityDto } from '@postybirb/types';
import { Transform } from 'class-transformer';

export abstract class DatabaseEntity implements IEntity {
  public readonly id: string;

  @Transform(({ value }) => new Date(value), {
    toClassOnly: true,
  })
  @Transform(({ value }) => value.toISOString(), {
    toPlainOnly: true,
  })
  public readonly createdAt: Date;

  @Transform(({ value }) => new Date(value), {
    toClassOnly: true,
  })
  @Transform(({ value }) => value.toISOString(), {
    toPlainOnly: true,
  })
  public readonly updatedAt: Date;

  constructor(entity: IEntity) {
    Object.assign(this, entity);
  }

  public abstract toObject(): IEntity;

  public abstract toDTO(): IEntityDto;
}
