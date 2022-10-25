import { EntityRepository } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { BaseEntity } from '../../database/entities/base.entity';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Base class that implements simple CRUD logic
 *
 * @class PostyBirbService
 */
@Injectable()
export abstract class PostyBirbService<T extends BaseEntity> {
  protected readonly logger = Logger(Object.getPrototypeOf(this).name);

  constructor(
    protected readonly repository: EntityRepository<T>,
    private readonly webSocket?: WSGateway
  ) {}

  protected async emit(event: WebSocketEvents) {
    if (this.webSocket) {
      this.webSocket.emit(event);
    }
  }
}
