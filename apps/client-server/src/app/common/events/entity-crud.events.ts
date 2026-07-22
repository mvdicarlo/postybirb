/* eslint-disable max-classes-per-file */
import { EntityId } from '@postybirb/types';

export class EntityCreatedEvent<T> {
  constructor(public readonly entity: T) {}
}

export class EntityUpdatedEvent<T> {
  constructor(public readonly entity: T) {}
}

export class EntityRemovedEvent {
  constructor(public readonly id: EntityId) {}
}