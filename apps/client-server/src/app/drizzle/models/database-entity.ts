/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EntityId,
  EntityPrimitive,
  IEntity,
  IEntityDto,
} from '@postybirb/types';
import {
  ClassConstructor,
  Exclude,
  plainToClass,
  plainToInstance
} from 'class-transformer';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schemas';

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

  public readonly createdAt: string;

  public readonly updatedAt: string;

  @Exclude()
  protected db: BetterSQLite3Database<typeof schema>;

  constructor(entity: Partial<IEntity>) {
    Object.assign(this, entity);
  }

  public abstract toObject(): EntityPrimitive;

  public abstract toDTO(): IEntityDto;

  public toJSON(): string {
    return JSON.stringify(this.toDTO());
  }

  public withDB(db: BetterSQLite3Database<typeof schema>): this {
    this.db = db;
    return this;
  }
}
