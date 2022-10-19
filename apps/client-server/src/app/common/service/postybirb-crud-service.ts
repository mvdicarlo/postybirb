import { EntityRepository, FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Constructor } from 'type-fest';
import { BaseEntity } from '../../database/entities/base.entity';
import {
  DatabaseUpdateSubscriber,
  OnDatabaseUpdateCallback,
} from '../../database/subscribers/database.subscriber';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { PostyBirbService } from './postybirb-service';

export interface OnDatabaseUpdate {
  getRegisteredEntities: () => Constructor<BaseEntity>[];
  onDatabaseUpdate: OnDatabaseUpdateCallback;
}

/**
 * Abstract implementation of common CRUD service operations.
 *
 * @abstract
 * @class PostyBirbCRUDService
 * @extends {PostyBirbService<T>}
 * @template T
 */
@Injectable()
export abstract class PostyBirbCRUDService<
  T extends BaseEntity
> extends PostyBirbService<T> {
  constructor(
    private moduleRef: ModuleRef,
    repository: EntityRepository<T>,
    webSocket?: WSGateway
  ) {
    super(repository, webSocket);
    this.removeMarkedEntities();
    this.registerToDatabaseUpdates();
  }

  /**
   * Implementation of entity creation
   *
   * @abstract
   * @param {unknown} createDto
   * @return {*}  {Promise<T>}
   */
  abstract create(createDto: unknown): Promise<T>;

  /**
   * Updates an entity given an update value.
   *
   * @abstract
   * @param {string} id
   * @param {unknown} update
   * @return {*}  {Promise<boolean>}
   */
  abstract update(id: string, update: unknown): Promise<boolean>;

  /**
   * Deletes an entity from the database.
   *
   * @param {(string | BaseEntity)} idOrEntity
   * @return {*}
   */
  async remove(idOrEntity: string | BaseEntity) {
    return this.repository.removeAndFlush(
      typeof idOrEntity === 'string'
        ? await this.findOne(idOrEntity)
        : (idOrEntity as BaseEntity)
    );
  }

  /**
   * Registers entities and callback for services implementing the
   * OnDatabaseUpdate interface.
   *
   */
  private registerToDatabaseUpdates() {
    const updater = this.moduleRef.get(DatabaseUpdateSubscriber, {
      strict: false,
    });
    if ('getRegisteredEntities' in this) {
      const me = this as OnDatabaseUpdate;

      updater.subscribe(
        me.getRegisteredEntities(),
        me.onDatabaseUpdate.bind(this)
      );
    }
  }

  /**
   * Iterates through and deletes marked entities from the database.
   *
   * @private
   */
  private async removeMarkedEntities() {
    const markedEntities = await this.find({
      markedForDeletion: true,
    } as FilterQuery<T>);

    markedEntities.forEach((entity) => this.repository.remove(entity));
    await this.repository.flush();
  }

  /**
   * Returns a single record by id or throws exception.
   *
   * @param {string} id
   * @return {*}
   */
  findOne(id: string) {
    try {
      return this.repository.findOneOrFail({ id } as FilterQuery<T>);
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Query database for records
   *
   * @param {FilterQuery<T>} query
   * @return {*}
   */
  find(query: FilterQuery<T>) {
    return this.repository.find(query);
  }

  /**
   * Return all records from database.
   *
   * @param {FindOptions<T>} [options]
   * @return {*}
   */
  findAll(options?: FindOptions<T>) {
    return this.repository.findAll(options);
  }

  /**
   * Updates an entity to be deleteable.
   * Experimental feature for allowing undo actions.
   *
   * @param {T} entity
   */
  async markForDeletion(entity: T) {
    // eslint-disable-next-line no-param-reassign
    entity.markedForDeletion = true;
    await this.repository.flush();
  }

  /**
   * Removes an entity from being deletable.
   *
   * @param {T} entity
   */
  async unmarkForDeletion(entity: T) {
    // eslint-disable-next-line no-param-reassign
    entity.markedForDeletion = false;
    await this.repository.flush();
  }
}
