import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    EntityRepository,
    RepoEntity,
    RepoSchemaKey,
    SchemaKey,
    SchemaTable,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId, IEntity } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';
import {
    publishEntityCreated,
    publishEntityRemoved,
    publishEntityUpdated,
} from '../events/entity-crud.events';

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

  private crudEventConfig?: {
    eventEmitter?: EventEmitter2;
    prefix: string;
  };

  constructor(
    repository: TRepo,
    private readonly webSocket?: WSGateway,
  ) {
    this.repository = repository;
  }

  /**
   * Enables standard CRUD event publication for this service.
   */
  protected configureCrudEvents(
    prefix: string,
    eventEmitter?: EventEmitter2,
  ): void {
    this.crudEventConfig = { prefix, eventEmitter };
  }

  protected publishCreated<TDto>(entity: TDto | TDto[]): void {
    if (this.crudEventConfig) {
      publishEntityCreated(
        this.crudEventConfig.eventEmitter,
        this.crudEventConfig.prefix,
        entity,
      );
    }
  }

  protected publishUpdated<TDto>(entity: TDto | TDto[]): void {
    if (this.crudEventConfig) {
      publishEntityUpdated(
        this.crudEventConfig.eventEmitter,
        this.crudEventConfig.prefix,
        entity,
      );
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

  /**
   * Drizzle table descriptor for the underlying schema. Convenience
   * alias for `this.repository.table` so subclasses can write
   * `eq(this.table.foo, ...)`.
   */
  protected get table(): SchemaTable<RepoSchemaKey<TRepo>> {
    return this.repository.table as SchemaTable<RepoSchemaKey<TRepo>>;
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

  public findById(id: EntityId): Promise<TEntity | null> {
    return this.repository.findById(id) as Promise<TEntity | null>;
  }

  public findByIdOrThrow(id: EntityId): Promise<TEntity> {
    return this.repository.findByIdOrThrow(id) as Promise<TEntity>;
  }

  public findAll(): Promise<TEntity[]> {
    return this.repository.findAll() as Promise<TEntity[]>;
  }

  public async remove(id: EntityId): Promise<void> {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    const result = await this.repository.deleteById([id]);
    if (result.changes > 0 && this.crudEventConfig) {
      publishEntityRemoved(
        this.crudEventConfig.eventEmitter,
        this.crudEventConfig.prefix,
        id,
      );
    }
  }

  // END Repository Wrappers
}
