import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { PostyBirbEntity } from '../../database/entities/postybirb-entity';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';

/**
 * Base class that implements simple CRUD logic
 *
 * @class PostyBirbService
 */
@Injectable()
export abstract class PostyBirbService<T extends PostyBirbEntity> {
  protected readonly logger = Logger(Object.getPrototypeOf(this).name);

  constructor(
    protected readonly repository: PostyBirbRepository<T>,
    private readonly webSocket?: WSGateway
  ) {}

  protected async emit(event: WebSocketEvents) {
    if (this.webSocket) {
      this.webSocket.emit(event);
    }
  }

  public findAll() {
    return this.repository.findAll();
  }
}
