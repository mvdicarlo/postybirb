import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
    Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { EntityDelta } from '@postybirb/types';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../../web-socket/web-socket.events';
import {
    EntityCreatedEvent,
    EntityDeltaDescriptor,
    EntityRemovedEvent,
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from './entity-crud.events';
import { ENTITY_DELTA_DESCRIPTORS } from './entity-delta.registry';

type BusHandler = (events: unknown[]) => void;

/**
 * Single generic bridge that forwards every registered entity's standard CRUD
 * events onto the websocket as {@link EntityDelta} payloads.
 */
@Injectable()
export class EntityDeltaBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = Logger(EntityDeltaBridge.name);

  private readonly registrations: Array<{
    event: string;
    handler: BusHandler;
  }> = [];

  constructor(
    @Optional() private readonly eventEmitter?: EventEmitter2,
    @Optional() private readonly webSocket?: WSGateway,
  ) {}

  onModuleInit(): void {
    if (!this.eventEmitter || this.registrations.length) {
      return;
    }

    ENTITY_DELTA_DESCRIPTORS.forEach((descriptor) =>
      this.registerDescriptor(descriptor),
    );
  }

  onModuleDestroy(): void {
    if (!this.eventEmitter) {
      return;
    }

    this.registrations.forEach(({ event, handler }) =>
      this.eventEmitter?.off(event, handler),
    );
    this.registrations.length = 0;
  }

  private registerDescriptor(descriptor: EntityDeltaDescriptor): void {
    const names = getEntityCrudEventNames(descriptor.prefix);

    this.register(names.created, (events: EntityCreatedEvent<unknown>[]) =>
      this.emit(descriptor.delta, {
        upserts: events.map((event) => event.entity),
        removedIds: [],
      }),
    );
    this.register(names.updated, (events: EntityUpdatedEvent<unknown>[]) =>
      this.emit(descriptor.delta, {
        upserts: events.map((event) => event.entity),
        removedIds: [],
      }),
    );
    this.register(names.removed, (events: EntityRemovedEvent[]) =>
      this.emit(descriptor.delta, {
        upserts: [],
        removedIds: events.map((event) => event.id),
      }),
    );
  }

  private register<T>(event: string, handler: (events: T[]) => void): void {
    const busHandler = handler as BusHandler;
    this.eventEmitter?.on(event, busHandler);
    this.registrations.push({ event, handler: busHandler });
  }

  private emit(delta: string, data: EntityDelta<unknown>): void {
    try {
      this.webSocket?.emit({ event: delta, data } as WebSocketEvents);
    } catch (error) {
      this.logger.error(`Error emitting ${delta} websocket delta`, error);
    }
  }
}
