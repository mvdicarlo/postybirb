import type { EntityId } from '@postybirb/types';
import type { SchemaKey } from '../../helper-types';

/**
 * Thrown by `saveFromEntity` when the in-memory entity's `updatedAt` does
 * not match the persisted row's `updatedAt` (optimistic concurrency
 * check). The caller is expected to re-fetch and reconcile.
 */
export class OptimisticConcurrencyError extends Error {
  public readonly schemaKey: SchemaKey;

  public readonly entityId: EntityId;

  constructor(schemaKey: SchemaKey, entityId: EntityId) {
    super(
      `Optimistic concurrency conflict on ${String(
        schemaKey,
      )} id "${entityId}"`,
    );
    this.name = 'OptimisticConcurrencyError';
    this.schemaKey = schemaKey;
    this.entityId = entityId;
  }
}
