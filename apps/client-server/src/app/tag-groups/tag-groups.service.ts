import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TagGroup, TagGroupRepository } from '@postybirb/database';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';
import {
    TAG_GROUP_CREATED,
    TAG_GROUP_REMOVED,
    TAG_GROUP_UPDATED,
    TagGroupCreatedEvent,
    TagGroupRemovedEvent,
    TagGroupUpdatedEvent,
} from './tag-group.events';

@Injectable()
export class TagGroupsService extends PostyBirbService<TagGroupRepository> {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super(new TagGroupRepository());
  }

  async create(createDto: CreateTagGroupDto): Promise<TagGroup> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagGroup '${createDto.name}'`);
    await this.throwIfExists(eq(this.table.name, createDto.name));
    const entity = await this.repository.insert(createDto);
    this.eventEmitter.emit(
      TAG_GROUP_CREATED,
      new TagGroupCreatedEvent(entity.toDTO()),
    );
    return entity;
  }

  async update(id: EntityId, update: UpdateTagGroupDto): Promise<TagGroup> {
    this.logger.withMetadata(update).info(`Updating TagGroup '${id}'`);
    const entity = await this.repository.update(id, update);
    this.eventEmitter.emit(
      TAG_GROUP_UPDATED,
      new TagGroupUpdatedEvent(entity.toDTO()),
    );
    return entity;
  }

  override async remove(id: EntityId): Promise<void> {
    this.logger.withMetadata({ id }).info(`Removing entity '${id}'`);
    const result = await this.repository.deleteById([id]);
    if (result.changes > 0) {
      this.eventEmitter.emit(
        TAG_GROUP_REMOVED,
        new TagGroupRemovedEvent(id),
      );
    }
  }
}
