import type { DatabaseEntity } from './entities/database-entity';
import { OptimisticConcurrencyError } from './repositories/base/optimistic-concurrency.error';
import { RepositoryRegistry } from './repositories/base/repository-registry';

/* eslint-disable no-param-reassign */

/**
 * Persist `entity` via the repository registered for its `entitySchemaKey`.
 *
 * Semantics (parity with the legacy
 * `apps/client-server/src/app/drizzle/postybirb-database/postybirb-database.util.ts`):
 *
 * - If a row with `entity.id` already exists and its persisted
 *   `updatedAt` differs from the in-memory `entity.updatedAt`, throws
 *   {@link OptimisticConcurrencyError}.
 * - If the row exists and `updatedAt` matches, the entity is updated and
 *   its `updatedAt` is refreshed in place.
 * - If no row exists, the entity is inserted and its `createdAt` /
 *   `updatedAt` are refreshed in place.
 *
 * The returned reference is the same `entity` instance the caller passed
 * in (mutated), matching legacy behaviour.
 */
export async function saveFromEntity<T extends DatabaseEntity>(
  entity: T,
): Promise<T> {
  const repo = RepositoryRegistry.get(entity.entitySchemaKey);
  const obj = entity.toObject();

  const exists = await repo.findById(entity.id);
  if (exists) {
    if (exists.updatedAt !== entity.updatedAt) {
      throw new OptimisticConcurrencyError(entity.entitySchemaKey, entity.id);
    }
    const updated = await repo.update(entity.id, obj);
    entity.updatedAt = updated.updatedAt;
  } else {
    const inserted = await repo.insert(obj);
    entity.createdAt = inserted.createdAt;
    entity.updatedAt = inserted.updatedAt;
  }

  return entity;
}
