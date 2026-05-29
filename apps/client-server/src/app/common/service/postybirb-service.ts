import { BadRequestException } from '@nestjs/common';
import {
  Action,
  EntityRepository,
  SchemaEntityMap,
  SchemaKey,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Base class that implements simple CRUD logic by delegating to a
 * lib-side `EntityRepository`. Phase E Step 24 removed the legacy
 * `PostyBirbDataSource` union, `adaptEntityRepository` shim, the
 * `string`-key constructor overload, and the `@Injectable()` decorator
 * (this class is abstract and never DI-resolved). Subclasses now hand
 * an explicit repository instance to `super(...)`.
 *
 * The second generic `TEntity` is inferred from the repository so
 * `findById`/`findAll`/`remove` callers receive concretely typed
 * results without restating the entity class.
 *
 * `EntityNotFoundError` → 404 translation is handled globally by
 * `EntityNotFoundExceptionFilter` (registered in `main.ts`), so this
 * base no longer remaps it per call.
 *
 * @see docs/DRIZZLE_REPOSITORY_MIGRATION_IMPLEMENTATION.md
 * @class PostyBirbService
 */
export abstract class PostyBirbService<
  TSchemaKey extends SchemaKey,
  TEntity extends SchemaEntityMap[TSchemaKey] = SchemaEntityMap[TSchemaKey],
> {
  protected readonly logger = Logger(this.constructor.name);

  protected readonly repository: EntityRepository<TSchemaKey, TEntity>;

  constructor(
    repository: EntityRepository<TSchemaKey, TEntity>,
    private readonly webSocket?: WSGateway,
  ) {
    this.repository = repository;
  }

  /**
   * Emits events onto the websocket
   *
   * @protected
   * @param {WebSocketEvents} event
   */
  protected async emit(event: WebSocketEvents) {
    try {
      if (this.webSocket) {
        this.webSocket.emit(event);
      }
    } catch (err) {
      this.logger.error(`Error emitting websocket event: ${event.event}`, err);
    }
  }

  /**
   * Drizzle table descriptor for the underlying schema. Convenience
   * alias for `this.repository.table` so subclasses can write
   * `eq(this.table.foo, ...)`.
   */
  protected get table() {
    return this.repository.table;
  }

  /**
   * Coalesced subscriber notification. Pass-through to
   * `this.repository.notify(ids, action)`.
   */
  protected notify(ids: EntityId[], action: Action) {
    this.repository.notify(ids, action);
  }

  /**
   * Throws exception if a record matching the query already exists.
   *
   * @protected
   * @param {SQL} where
   */
  protected async throwIfExists(where: SQL) {
    const exists = await this.repository.select(where);
    if (exists.length) {
      this.logger
        .withMetadata(exists)
        .error(`A duplicate entity already exists`);
      throw new BadRequestException(`A duplicate entity already exists`);
    }
  }

  // Repository Wrappers

  public findById(
    id: EntityId,
    options?: { failOnMissing?: boolean },
  ): Promise<TEntity | null> {
    return this.repository.findById(id, options);
  }

  public findAll(): Promise<TEntity[]> {
    return this.repository.findAll();
  }

  public async remove(id: EntityId): Promise<void> {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    await this.repository.deleteById([id]);
  }

  // END Repository Wrappers
}
