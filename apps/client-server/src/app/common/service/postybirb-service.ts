import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EntityRepository,
  SchemaKey,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { Action, EntityId } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { FindOptions } from '../../drizzle/postybirb-database/find-options.type';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Temporary union of the legacy `PostyBirbDatabase` wrapper and the new
 * lib-side `EntityRepository`. Introduced for Phase D Step 17 of the
 * Drizzle Repository Migration so this base class can accept either
 * source while per-schema services migrate one at a time. Removed in
 * Phase E Step 24.
 *
 * @see docs/DRIZZLE_REPOSITORY_MIGRATION_IMPLEMENTATION.md
 */
export type PostyBirbDataSource<TKey extends SchemaKey> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | PostyBirbDatabase<TKey>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | EntityRepository<TKey, any>;

/**
 * Adapt a lib-side `EntityRepository` into the structural shape the
 * subclasses currently consume via `this.repository.*` (i.e. the legacy
 * `PostyBirbDatabase` surface). Grafts the two surface differences
 * (`schemaEntity` → `table`, `forceNotify` → `notify`) so existing
 * subclass call sites keep compiling and running unchanged through the
 * per-schema cutover in Phase D Steps 19-20.
 *
 * Removed in Phase E Step 24 once every call site has migrated to the
 * lib surface directly (`.table`, `.notify`).
 */
function adaptEntityRepository<TKey extends SchemaKey>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repo: EntityRepository<TKey, any>,
): PostyBirbDatabase<TKey> {
  const adapted = repo as unknown as PostyBirbDatabase<TKey> & {
    schemaEntity?: unknown;
    forceNotify?: (ids: EntityId[], action: Action) => void;
  };
  if (!('schemaEntity' in adapted)) {
    Object.defineProperty(adapted, 'schemaEntity', {
      get: () => repo.table,
      configurable: true,
    });
  }
  if (!adapted.forceNotify) {
    adapted.forceNotify = (ids, action) => repo.notify(ids, action);
  }
  return adapted as PostyBirbDatabase<TKey>;
}

/**
 * Base class that implements simple CRUD logic
 *
 * @class PostyBirbService
 */
@Injectable()
export abstract class PostyBirbService<TSchemaKey extends SchemaKey> {
  protected readonly logger = Logger(this.constructor.name);

  protected readonly repository: PostyBirbDatabase<TSchemaKey>;

  constructor(
    private readonly source: TSchemaKey | PostyBirbDataSource<TSchemaKey>,
    private readonly webSocket?: WSGateway,
  ) {
    if (typeof source === 'string') {
      this.repository = new PostyBirbDatabase(source);
    } else if (source instanceof PostyBirbDatabase) {
      this.repository = source;
    } else {
      this.repository = adaptEntityRepository(source);
    }
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

  protected get schema() {
    return this.repository.schemaEntity;
  }

  /**
   * Throws exception if a record matching the query already exists.
   *
   * @protected
   * @param {FilterQuery<T>} where
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

  public findById(id: EntityId, options?: FindOptions) {
    return this.repository.findById(id, options);
  }

  public findAll() {
    return this.repository.findAll();
  }

  public remove(id: EntityId) {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    return this.repository.deleteById([id]);
  }

  // END Repository Wrappers
}
