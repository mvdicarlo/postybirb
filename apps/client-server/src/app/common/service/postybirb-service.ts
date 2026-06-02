import { BadRequestException } from '@nestjs/common';
import {
  Action,
  EntityRepository,
  FindOptions,
  RepoEntity,
  SchemaKey,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId, IEntity } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { SetRequired } from 'type-fest';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Abstract base for NestJS CRUD services. Delegates reads and writes to
 * a concrete `EntityRepository` from `@postybirb/database`.
 *
 * Generic over the *repository class*: subclasses write
 * `extends PostyBirbService<AccountRepository>` and `this.repository`
 * is typed as the concrete `AccountRepository`, exposing any
 * subclass-specific query helpers without a cast.
 *
 * `EntityNotFoundError` → 404 translation is handled globally by
 * `EntityNotFoundExceptionFilter` (registered in `main.ts`).
 *
 * @class PostyBirbService
 */
export abstract class PostyBirbService<
  TRepo extends EntityRepository<SchemaKey, IEntity>,
  TEntity extends IEntity = RepoEntity<TRepo>,
> {
  protected readonly logger = Logger(this.constructor.name);

  protected readonly repository: TRepo;

  constructor(
    repository: TRepo,
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
  protected async throwIfExists(where: SQL | undefined) {
    if (!where) return;
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
    options?: SetRequired<FindOptions, 'failOnMissing'>,
  ): Promise<TEntity>;
  public findById(
    id: EntityId,
    options?: FindOptions,
  ): Promise<TEntity | null>;
  public findById(
    id: EntityId,
    options?: FindOptions,
  ): Promise<TEntity | null> {
    return this.repository.findById(id, options) as Promise<TEntity | null>;
  }

  public findAll(): Promise<TEntity[]> {
    return this.repository.findAll() as Promise<TEntity[]>;
  }

  public async remove(id: EntityId): Promise<void> {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    await this.repository.deleteById([id]);
  }

  // END Repository Wrappers
}
