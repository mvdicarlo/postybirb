import { EntityRepository, FilterQuery, FindOptions } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { BaseEntity } from '../../database/entities/base.entity';
import { DatabaseUpdateSubscriber } from '../../database/subscribers/database.subscriber';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { isOnDatabaseQuery } from './modifiers/on-database-query';
import { isOnDatabaseUpdate } from './modifiers/on-database-update';
import { PostyBirbService } from './postybirb-service';

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
   * @param {unknown} update
   * @return {*}  {Promise<boolean>}
   */
  abstract update(update: unknown): Promise<boolean>;

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

    if (isOnDatabaseUpdate(this)) {
      updater.subscribe(
        this.getRegisteredEntities(),
        this.onDatabaseUpdate.bind(this)
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

  private getQueryOptions(): FindOptions<T, string> {
    return isOnDatabaseQuery(this) ? this.getDefaultQueryOptions() : {};
  }

  /**
   * Returns a single record by id or throws exception.
   *
   * @param {string} id
   * @return {*}
   */
  findOne(id: string, options?: FindOptions<T, string>) {
    try {
      return this.repository.findOneOrFail(
        { id } as FilterQuery<T>,
        options ?? this.getQueryOptions()
      );
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
  find(query: FilterQuery<T>, options?: FindOptions<T, string>) {
    return this.repository.find(query, options ?? this.getQueryOptions());
  }

  /**
   * Return all records from database.
   *
   * @param {FindOptions<T>} [options]
   * @return {*}
   */
  findAll(options?: FindOptions<T, string>) {
    return this.repository.findAll(options ?? this.getQueryOptions());
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

  // DTO Operations

  async findAllAsDto<TClass>(
    dtoClass?: ClassConstructor<unknown>
  ): Promise<TClass[]> {
    const records = await this.repository.findAll();

    if (dtoClass) {
      return records.map(
        (record) => plainToClass(dtoClass, record.toJSON()) as TClass
      );
    }

    return records.map((record) => record.toJSON() as unknown as TClass);
  }
}
