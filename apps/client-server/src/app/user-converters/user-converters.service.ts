import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserConverter, UserConverterRepository } from '@postybirb/database';
import { DynamicObject, EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Website } from '../websites/website';
import { CreateUserConverterDto } from './dtos/create-user-converter.dto';
import { UpdateUserConverterDto } from './dtos/update-user-converter.dto';
import { USER_CONVERTER_EVENT_PREFIX } from './user-converter.events';

@Injectable()
export class UserConvertersService extends PostyBirbService<UserConverterRepository> {
  constructor(@Optional() eventEmitter?: EventEmitter2) {
    super(new UserConverterRepository());
    this.configureCrudEvents(USER_CONVERTER_EVENT_PREFIX, eventEmitter);
  }

  async create(createDto: CreateUserConverterDto): Promise<UserConverter> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating UserConverter '${createDto.username}'`);
    await this.throwIfExists(eq(this.table.username, createDto.username));
    const entity = await this.repository.insert(createDto);
    this.publishCreated(entity.toDTO());
    return entity;
  }

  async update(
    id: EntityId,
    update: UpdateUserConverterDto,
  ): Promise<UserConverter> {
    this.logger.withMetadata(update).info(`Updating UserConverter '${id}'`);
    const entity = await this.repository.update(id, update);
    this.publishUpdated(entity.toDTO());
    return entity;
  }

  /**
   * Converts a username using user defined conversion table.
   */
  async convert(
    instance: Website<DynamicObject>,
    username: string,
  ): Promise<string> {
    const converter = await this.repository.findOne({
      where: (c, { eq: eqFn }) => eqFn(c.username, username),
    });

    if (!converter) {
      return username;
    }

    return (
      converter.convertTo[instance.decoratedProps.metadata.name] ??
      converter.convertTo.default ??
      username
    );
  }
}
