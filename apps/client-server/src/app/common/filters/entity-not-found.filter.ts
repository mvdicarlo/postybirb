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
 * Registered globally in `main.ts`.
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
