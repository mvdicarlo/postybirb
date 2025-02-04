/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityId, IEntity, IEntityDto } from '@postybirb/types';
import {
  ClassConstructor,
  plainToClass,
  plainToInstance,
} from 'class-transformer';
import { v4 } from 'uuid';

export function fromDatabaseRecord<TEntity>(
  entity: ClassConstructor<TEntity>,
  record: any[],
): TEntity[];
export function fromDatabaseRecord<TEntity>(
  entity: ClassConstructor<TEntity>,
  record: any,
): TEntity;
export function fromDatabaseRecord<TEntity>(
  entity: ClassConstructor<TEntity>,
  record: any | any[],
): TEntity | TEntity[] {
  if (Array.isArray(record)) {
    return record.map((r) =>
      plainToInstance(entity, r, { enableCircularCheck: true }),
    ) as TEntity[];
  }
  return plainToClass(entity, record, {
    enableCircularCheck: true,
  }) as TEntity;
}

export abstract class DatabaseEntity implements IEntity {
  public readonly id: EntityId;

  public createdAt: string;

  public updatedAt: string;

  constructor(entity: Partial<IEntity>) {
    Object.assign(this, entity);
    if (!this.id) {
      this.id = v4();
    }
  }

  public abstract toObject(): IEntity;

  public abstract toDTO(): IEntityDto;

  public toJSON(): string {
    return JSON.stringify(this.toDTO());
  }
}
