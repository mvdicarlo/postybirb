import {
  EntityDTO,
  EntityRepository,
  FilterQuery,
  Loaded,
  wrap,
} from '@mikro-orm/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IEntity } from '@postybirb/types';
import { EventEmitter } from 'events';
import { Constructor } from 'type-fest';
import { PostyBirbEntity } from '../entities/postybirb-entity';
import {
  DatabaseUpdateSubscriber,
  EntityUpdateRecord,
  SubscribableEntities,
} from '../subscribers/database.subscriber';

type EventMap = {
  change: EntityUpdateRecord<SubscribableEntities>[];
};

type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

export type FindOptions = {
  failOnMissing: boolean;
};

export class PostyBirbRepository<
  T extends IEntity
> extends EntityRepository<T> {
  private emitter = new EventEmitter();

  public addUpdateListener(
    subscriber: DatabaseUpdateSubscriber,
    types: Constructor<PostyBirbEntity>[],
    fn: (change: EntityUpdateRecord<SubscribableEntities>[]) => void
  ) {
    subscriber.subscribe(types, (updates) => {
      this.emitter.emit('change', updates);
    });

    return this.on('change', fn);
  }

  on<K extends EventKey<EventMap>>(
    eventName: K,
    fn: EventReceiver<EventMap[K]>
  ) {
    this.emitter.on(eventName, fn);
    return this;
  }

  async findById(id: string, options?: FindOptions) {
    const entity = await this.findOne({ id } as FilterQuery<T>);

    if (!entity && options?.failOnMissing) {
      throw new NotFoundException(`Unable to find entity Id '${id}'`);
    }

    return entity;
  }

  async update(id: string, dto: Partial<EntityDTO<Loaded<T, never>>>) {
    const entity = await this.findById(id, { failOnMissing: true });

    try {
      const updatedEntity = wrap(entity).assign(dto);
      await this.flush();
      return updatedEntity;
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  async delete(entity: string | T) {
    // Assume Id
    if (typeof entity === 'string') {
      // eslint-disable-next-line no-param-reassign
      entity = await this.findById(entity);
    }

    return super.removeAndFlush(entity as T);
  }
}
