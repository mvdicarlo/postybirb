/* eslint-disable no-param-reassign */
import { SchemaKey, Schemas } from '@postybirb/database';
import { DatabaseEntity } from '../models';
import { PostyBirbDatabase } from './postybirb-database';

export class PostyBirbDatabaseUtil {
  static async saveFromEntity<T extends DatabaseEntity>(entity: T) {
    const obj = entity.toObject();
    let entitySchemaKey: SchemaKey | undefined;
    for (const schemaKey of Object.keys(Schemas)) {
      if (schemaKey === `${entity.constructor.name}Schema`) {
        entitySchemaKey = schemaKey as SchemaKey;
        break;
      }
    }

    if (!entitySchemaKey) {
      throw new Error(`Could not find schema for ${entity.constructor.name}`);
    }

    const db = new PostyBirbDatabase(entitySchemaKey);
    const exists = await db.findById(entity.id);
    if (exists) {
      if (exists.updatedAt !== entity.updatedAt) {
        throw new Error('Entity has been updated since last fetch');
      }
      const update = await db.update(entity.id, obj);
      entity.updatedAt = update.updatedAt;
    } else {
      const insert = await db.insert(obj);
      entity.createdAt = insert.createdAt;
      entity.updatedAt = insert.updatedAt;
    }

    return entity;
  }
}
