import { IEntity, IEntityDto } from '@postybirb/types';
import { Exclude, plainToClass, Transform } from 'class-transformer';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { Class } from 'type-fest';
import * as schema from '../schemas';

export function fromDatabaseRecord<TEntity extends DatabaseEntity>(
  entity: Class<TEntity>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any[],
): TEntity[];
export function fromDatabaseRecord<TEntity extends DatabaseEntity>(
  entity: Class<TEntity>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any,
): TEntity;
export function fromDatabaseRecord<TEntity extends DatabaseEntity>(
  entity: Class<TEntity>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any | any[],
): TEntity | TEntity[] {
  return plainToClass(entity, record, {
    enableCircularCheck: true,
  });
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

  public toJson(): string {
    return JSON.stringify(this.toDTO());
  }

  public withDB(db: BetterSQLite3Database<typeof schema>): this {
    this.db = db;
    return this;
  }
}
