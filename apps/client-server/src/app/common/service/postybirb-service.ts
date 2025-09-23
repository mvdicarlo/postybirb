import { BadRequestException, Injectable } from '@nestjs/common';
import { SchemaKey } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId } from '@postybirb/types';
import { SQL } from 'drizzle-orm';
import { debounce } from 'lodash';
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

  private readonly debouncedEmits = new Map<
    string,
    ReturnType<typeof debounce>
  >();

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
      const eventKey = event.event;

      // Get or create debounced function for this event type
      if (!this.debouncedEmits.has(eventKey)) {
        const debouncedEmit = debounce((latestEvent: WebSocketEvents) => {
          this.logger.debug(
            `Emitting debounced event '${latestEvent.event} [${latestEvent.data.length}]'`,
          );
          if (this.webSocket) {
            this.webSocket.emit(latestEvent);
          }
        }, 50);

        this.debouncedEmits.set(eventKey, debouncedEmit);
      }

      // Call the debounced function with the latest event
      const debouncedFunction = this.debouncedEmits.get(eventKey);
      if (debouncedFunction) {
        debouncedFunction(event);
      }
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
