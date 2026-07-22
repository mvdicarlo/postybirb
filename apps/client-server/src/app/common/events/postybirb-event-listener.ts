import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { EntityDelta } from '@postybirb/types';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';
import {
  EntityCreatedEvent,
  EntityRemovedEvent,
  EntityUpdatedEvent,
  getEntityCrudEventNames,
} from './entity-crud.events';

export abstract class PostyBirbEventListener<TDto>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = Logger(this.constructor.name);

  private readonly eventNames;

  private isListening = false;

  private readonly createdListener = (events: EntityCreatedEvent<TDto>[]) => {
    this.handleCreated(events);
  };

  private readonly updatedListener = (events: EntityUpdatedEvent<TDto>[]) => {
    this.handleUpdated(events);
  };

  private readonly removedListener = (events: EntityRemovedEvent[]) => {
    this.handleRemoved(events);
  };

  protected constructor(
    eventPrefix: string,
    private readonly deltaEvent: string,
    private readonly eventEmitter?: EventEmitter2,
    private readonly webSocket?: WSGateway,
  ) {
    this.eventNames = getEntityCrudEventNames(eventPrefix);
  }

  onModuleInit(): void {
    if (!this.eventEmitter || this.isListening) {
      return;
    }

    this.eventEmitter.on(this.eventNames.created, this.createdListener);
    this.eventEmitter.on(this.eventNames.updated, this.updatedListener);
    this.eventEmitter.on(this.eventNames.removed, this.removedListener);
    this.isListening = true;
  }

  onModuleDestroy(): void {
    if (!this.eventEmitter || !this.isListening) {
      return;
    }

    this.eventEmitter.off(this.eventNames.created, this.createdListener);
    this.eventEmitter.off(this.eventNames.updated, this.updatedListener);
    this.eventEmitter.off(this.eventNames.removed, this.removedListener);
    this.isListening = false;
  }

  protected handleCreated(events: EntityCreatedEvent<TDto>[]): void {
    this.emit({ upserts: events.map((event) => event.entity), removedIds: [] });
  }

  protected handleUpdated(events: EntityUpdatedEvent<TDto>[]): void {
    this.emit({ upserts: events.map((event) => event.entity), removedIds: [] });
  }

  protected handleRemoved(events: EntityRemovedEvent[]): void {
    this.emit({ upserts: [], removedIds: events.map((event) => event.id) });
  }

  protected emit(data: EntityDelta<TDto>): void {
    try {
      this.webSocket?.emit({ event: this.deltaEvent, data } as WebSocketEvents);
    } catch (error) {
      this.logger.error(
        `Error emitting ${this.deltaEvent} websocket delta`,
        error,
      );
    }
  }
}
