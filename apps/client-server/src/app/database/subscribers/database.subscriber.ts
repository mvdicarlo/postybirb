import {
  ChangeSet,
  ChangeSetType,
  EventSubscriber,
  FlushEventArgs,
  Subscriber,
} from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Constructor } from 'type-fest';
import { v4 } from 'uuid';
import { PostyBirbEntity } from '../entities/postybirb-entity';

export type SubscribableEntities = PostyBirbEntity;

export type EntityUpdateRecord<T = SubscribableEntities> = [ChangeSetType, T];
export type OnDatabaseUpdateCallback<T = SubscribableEntities> = (
  updates: EntityUpdateRecord<T>[]
) => void;

const registeredListeners: Map<
  Constructor<SubscribableEntities>,
  OnDatabaseUpdateCallback[]
> = new Map();

/**
 * Service that subscribes to updates that occurs in the database
 * the emits events to listeners (for emits and other reactive events).
 *
 * @class DatabaseUpdateSubscriber
 * @implements {EventSubscriber<SubscribableEntities>}
 */
@Subscriber()
@Injectable()
export class DatabaseUpdateSubscriber
  implements EventSubscriber<SubscribableEntities>
{
  private id = v4();

  async afterFlush(event: FlushEventArgs): Promise<void> {
    this.publish(
      event.uow.getChangeSets() as unknown as ChangeSet<SubscribableEntities>[]
    );
  }

  /**
   * Subscribe a callback function to a list of entities.
   *
   * @param {Constructor<SubscribableEntities>[]} entities
   * @param {OnDatabaseUpdateCallback} func
   */
  public subscribe(
    entities: Constructor<SubscribableEntities>[],
    func: OnDatabaseUpdateCallback
  ): void {
    entities.forEach((entity) => {
      if (!registeredListeners.has(entity)) {
        registeredListeners.set(entity, []);
      }

      registeredListeners.set(entity, [
        ...registeredListeners.get(entity),
        func,
      ]);
    });
  }

  /**
   * Publishes updates to the database to registered callbacks.
   *
   * @param {ChangeSet<SubscribableEntities>[]} changeSet
   */
  private publish(changeSet: ChangeSet<SubscribableEntities>[]) {
    const callbacks: Map<OnDatabaseUpdateCallback, EntityUpdateRecord[]> =
      new Map();
    const seen: string[] = [];
    changeSet.forEach((change) => {
      // Retrieve any callbacks registered
      const proto = Object.getPrototypeOf(change.entity);
      if (registeredListeners.has(proto.constructor)) {
        registeredListeners.get(proto.constructor).forEach((cb) => {
          // Filter duplicates out since an callback can be put on multiple entities
          if (!callbacks.get(cb)) {
            callbacks.set(cb, []);
          }

          if (
            !seen.includes(
              `${proto.constructor}:${change.type}:${change.entity.id}`
            )
          )
            seen.push(
              `${proto.constructor}:${change.type}:${change.entity.id}`
            );
          callbacks.set(cb, [
            ...callbacks.get(cb),
            [change.type, change.entity],
          ]);
        });
      }
    });

    callbacks.forEach((value, cb) => {
      cb(value);
    });
  }
}
