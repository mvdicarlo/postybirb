import { FilterQuery } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { PostyBirbEntity } from '../../database/entities/postybirb-entity';
import {
  FindOptions,
  PostyBirbRepository,
} from '../../database/repositories/postybirb-repository';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Base class that implements simple CRUD logic
 *
 * @class PostyBirbService
 */
@Injectable()
export abstract class PostyBirbService<
  T extends PostyBirbEntity = PostyBirbEntity
> {
  protected readonly logger = Logger();

  constructor(
    protected readonly repository: PostyBirbRepository<T>,
    private readonly webSocket?: WSGateway
  ) {}

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

  /**
   * Throws exception if a record matching the query already exists.
   *
   * @protected
   * @param {FilterQuery<T>} where
   */
  protected async throwIfExists(where: FilterQuery<T>) {
    const exists = await this.repository.findOne(where);
    if (exists) {
      const err = new BadRequestException(
        `An entity with query '${JSON.stringify(where)}' already exists`
      );
      this.logger.withError(err).error();
      throw err;
    }
  }

  // Repository Wrappers

  public findById(id: string, options?: FindOptions) {
    return this.repository.findById(id, options);
  }

  public findAll() {
    return this.repository.findAll();
  }

  public remove(id: string) {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    return this.repository.delete(id);
  }

  // END Repository Wrappers
}
