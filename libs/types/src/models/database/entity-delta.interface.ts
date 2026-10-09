import { EntityId } from './entity.interface';

/**
 * Incremental entity changes sent after an initial collection snapshot.
 * An entity ID must not appear in both fields of the same delta.
 */
export interface EntityDelta<T> {
  upserts: T[];
  removedIds: EntityId[];
}