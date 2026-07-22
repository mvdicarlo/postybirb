/* eslint-disable max-classes-per-file */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityDelta, EntityId } from '@postybirb/types';
import { WebsocketEvent } from '../../web-socket/models/web-socket-event';

export type EntityCrudEventNames<TPrefix extends string = string> = {
  created: `${TPrefix}.created`;
  updated: `${TPrefix}.updated`;
  removed: `${TPrefix}.removed`;
};

export function getEntityCrudEventNames<TPrefix extends string>(
  prefix: TPrefix,
): EntityCrudEventNames<TPrefix> {
  return {
    created: `${prefix}.created`,
    updated: `${prefix}.updated`,
    removed: `${prefix}.removed`,
  };
}

export class EntityCreatedEvent<T> {
  constructor(public readonly entity: T) {}
}

export class EntityUpdatedEvent<T> {
  constructor(public readonly entity: T) {}
}

export class EntityRemovedEvent {
  constructor(public readonly id: EntityId) {}
}

export type EntityDeltaEvent<T> = WebsocketEvent<EntityDelta<T>>;

function toArray<V>(value: V | V[]): V[] {
  return Array.isArray(value) ? value : [value];
}

export function publishEntityCreated<T>(
  eventEmitter: EventEmitter2 | undefined,
  prefix: string,
  entities: T | T[],
): void {
  const events = toArray(entities).map(
    (entity) => new EntityCreatedEvent(entity),
  );
  if (!events.length) {
    return;
  }
  eventEmitter?.emit(getEntityCrudEventNames(prefix).created, events);
}

export function publishEntityUpdated<T>(
  eventEmitter: EventEmitter2 | undefined,
  prefix: string,
  entities: T | T[],
): void {
  const events = toArray(entities).map(
    (entity) => new EntityUpdatedEvent(entity),
  );
  if (!events.length) {
    return;
  }
  eventEmitter?.emit(getEntityCrudEventNames(prefix).updated, events);
}

export function publishEntityRemoved(
  eventEmitter: EventEmitter2 | undefined,
  prefix: string,
  ids: EntityId | EntityId[],
): void {
  const events = toArray(ids).map((id) => new EntityRemovedEvent(id));
  if (!events.length) {
    return;
  }
  eventEmitter?.emit(getEntityCrudEventNames(prefix).removed, events);
}
