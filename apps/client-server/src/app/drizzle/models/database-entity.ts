/* eslint-disable @typescript-eslint/no-explicit-any */
import { SchemaKey, Schemas } from '@postybirb/database';
import { EntityId, IEntity, IEntityDto } from '@postybirb/types';
import {
  ClassConstructor,
  plainToClass,
  plainToInstance,
} from 'class-transformer';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../postybirb-database/postybirb-database';

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

  public async save(
    saveNested = false,
    circularCheck: object[] = [],
  ): Promise<this> {
    if (circularCheck.includes(this)) {
      return this;
    }
    const obj = this.toObject();

    let entitySchemaKey: SchemaKey | undefined;
    for (const schemaKey of Object.keys(Schemas)) {
      if (schemaKey === `${this.constructor.name}Schema`) {
        entitySchemaKey = schemaKey as SchemaKey;
        break;
      }
    }

    if (!entitySchemaKey) {
      throw new Error(`Could not find schema for ${this.constructor.name}`);
    }

    const db = new PostyBirbDatabase(entitySchemaKey);
    const exists = await db.findById(this.id);
    if (exists) {
      if (exists.updatedAt !== this.updatedAt) {
        throw new Error('Entity has been updated since last fetch');
      }
      const update = await db.update(this.id, obj);
      this.updatedAt = update.updatedAt;
    } else {
      const insert = await db.insert(obj);
      this.createdAt = insert.createdAt;
      this.updatedAt = insert.updatedAt;
    }
    if (saveNested) {
      circularCheck.push(this);
      for (const value of Object.values(this)) {
        if (value instanceof DatabaseEntity) {
          await value.save(saveNested);
        } else if (
          Array.isArray(value) &&
          value.length > 0 &&
          value[0] instanceof DatabaseEntity
        ) {
          await Promise.all(
            value.map((v) => v.save(saveNested, circularCheck)),
          );
        }
      }
    }

    return this;
  }
}
