/* eslint-disable @typescript-eslint/no-explicit-any */
import { IEntity, IEntityDto } from '@postybirb/types';
import {
  ClassConstructor,
  Exclude,
  plainToInstance,
  Transform,
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
  return plainToInstance(entity, record, {
    enableCircularCheck: true,
  }) as TEntity;
}

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

  @Exclude()
  protected db: BetterSQLite3Database<typeof schema>;

  constructor(entity: IEntity) {
    Object.assign(this, entity);
  }

  public abstract toObject(): IEntity;

  public abstract toDTO(): IEntityDto;

  public toJSON(): string {
    return JSON.stringify(this.toDTO());
  }

  public withDB(db: BetterSQLite3Database<typeof schema>): this {
    this.db = db;
    return this;
  }
}
