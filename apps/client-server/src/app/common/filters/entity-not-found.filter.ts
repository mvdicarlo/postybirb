import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { EntityNotFoundError } from '@postybirb/database';

/**
 * Translates lib-layer `EntityNotFoundError` into Nest's
 * `NotFoundException` so HTTP callers see a 404 instead of a 500.
 *
 * Registered globally in `main.ts`. Replaces the per-call remap that
 * lived in the legacy `adaptEntityRepository` shim removed in Phase E
 * Step 24. See docs/DRIZZLE_REPOSITORY_MIGRATION_IMPLEMENTATION.md.
 */
@Catch(EntityNotFoundError)
export class EntityNotFoundExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter<EntityNotFoundError>
{
  catch(exception: EntityNotFoundError, host: ArgumentsHost) {
    super.catch(new NotFoundException(exception.message), host);
  }
}
