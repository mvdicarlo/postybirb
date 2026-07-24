import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TagGroup, TagGroupRepository } from '@postybirb/database';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';
import { TAG_GROUP_EVENT_PREFIX } from './tag-group.events';

@Injectable()
export class TagGroupsService extends PostyBirbService<TagGroupRepository> {
  constructor(@Optional() eventEmitter?: EventEmitter2) {
    super(new TagGroupRepository());
    this.configureCrudEvents(TAG_GROUP_EVENT_PREFIX, eventEmitter);
  }

  async create(createDto: CreateTagGroupDto): Promise<TagGroup> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagGroup '${createDto.name}'`);
    await this.throwIfExists(eq(this.table.name, createDto.name));
    const entity = await this.repository.insert(createDto);
    this.publishCreated(entity.toDTO());
    return entity;
  }

  async update(id: EntityId, update: UpdateTagGroupDto): Promise<TagGroup> {
    this.logger.withMetadata(update).info(`Updating TagGroup '${id}'`);
    const entity = await this.repository.update(id, update);
    this.publishUpdated(entity.toDTO());
    return entity;
  }
}
