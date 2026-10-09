import type { EntityId } from '@postybirb/types';
import type { SchemaKey } from '../../helper-types';

/**
 * Thrown by `EntityRepository.findByIdOrThrow()` and by
 * `EntityRepository.update()` when the target row does not exist.
 *
 * Plain `Error` subclass — `libs/database` is framework-agnostic and does
 * NOT throw `@nestjs/common` `NotFoundException`. The `PostyBirbService`
 * base in `apps/client-server` is responsible for catching this and
 * re-throwing as `NotFoundException` when a caller depends on the NestJS
 * exception filter behaviour.
 *
 * Message format is standardised as:
 *   `{SchemaKey} with id "{id}" not found`
 */
export class EntityNotFoundError extends Error {
  public readonly schemaKey: SchemaKey;

  public readonly entityId: EntityId;

  constructor(schemaKey: SchemaKey, entityId: EntityId) {
    super(`${String(schemaKey)} with id "${entityId}" not found`);
    this.name = 'EntityNotFoundError';
    this.schemaKey = schemaKey;
    this.entityId = entityId;
  }
}
