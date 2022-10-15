import { EntityRepository, FilterQuery, FindOptions } from '@mikro-orm/core';
import { NotFoundException } from '@nestjs/common';
import { BaseEntity } from '../../database/entities/base.entity';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { PostyBirbService } from './postybirb-service';

export abstract class PostyBirbCRUDService<
  T extends BaseEntity
> extends PostyBirbService<T> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(repository: EntityRepository<T>, webSocket?: WSGateway) {
    super(repository, webSocket);
    this.removeMarkedEntities();
  }

  abstract create(createDto: unknown): Promise<T>;

  findOne(id: string) {
    try {
      return this.repository.findOneOrFail({ id } as FilterQuery<T>);
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  find(query: FilterQuery<T>) {
    return this.repository.find(query);
  }

  findAll(options?: FindOptions<T>) {
    return this.repository.findAll(options);
  }

  async markForDeletion(entity: T) {
    // eslint-disable-next-line no-param-reassign
    entity.markedForDeletion = true;
    await this.repository.flush();
  }

  async unmarkForDeletion(entity: T) {
    // eslint-disable-next-line no-param-reassign
    entity.markedForDeletion = false;
    await this.repository.flush();
  }

  private async removeMarkedEntities() {
    const markedEntities = await this.find({
      markedForDeletion: true,
    } as FilterQuery<T>);

    markedEntities.forEach((entity) => this.repository.remove(entity));
    await this.repository.flush();
  }
}
