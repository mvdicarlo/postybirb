import { BadRequestException, Injectable } from '@nestjs/common';
import { SchemaKey } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { FindOptions } from '../../drizzle/postybirb-database/find-options.type';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

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
    private readonly table: TSchemaKey | PostyBirbDatabase<TSchemaKey>,
    private readonly webSocket?: WSGateway,
  ) {
    if (typeof table === 'string') {
      this.repository = new PostyBirbDatabase(table);
    } else {
      this.repository = table;
    }
  }

  /**
   * Emits events onto the websocket
   *
   * @protected
   * @param {WebSocketEvents} event
   */
  protected async emit(event: WebSocketEvents) {
    if (this.webSocket) {
      this.webSocket.emit(event);
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
      const err = new BadRequestException(`A duplicate entity already exists`);
      this.logger.withError(err).error();
      throw err;
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
