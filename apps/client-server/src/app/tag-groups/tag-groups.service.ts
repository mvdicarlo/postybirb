import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { Constructor } from 'type-fest';
import { OnDatabaseUpdate } from '../common/service/modifiers/on-database-update';
import { PostyBirbCRUDService } from '../common/service/postybirb-crud-service';
import { TagGroup } from '../database/entities';
import { BaseEntity } from '../database/entities/base.entity';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';

@Injectable()
export class TagGroupsService
  extends PostyBirbCRUDService<TagGroup>
  implements OnDatabaseUpdate
{
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    moduleRef: ModuleRef,
    @InjectRepository(TagGroup)
    repository: EntityRepository<TagGroup>,
    @Optional() webSocket?: WSGateway
  ) {
    super(moduleRef, repository, webSocket);
  }

  getRegisteredEntities(): Constructor<BaseEntity>[] {
    return [TagGroup];
  }

  onDatabaseUpdate() {
    this.emit();
  }

  async create(createDto: CreateTagGroupDto): Promise<TagGroup> {
    const tagGroup = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagGroup);
    return tagGroup;
  }

  async update(update: UpdateTagGroupDto): Promise<boolean> {
    const tagGroup: TagGroup = await this.findOne(update.id);
    tagGroup.name = update.name;
    tagGroup.tags = update.tags;

    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  /**
   * Emits account state and data onto websocket.
   */
  protected async emit() {
    super.emit({
      event: TAG_GROUP_UPDATES,
      data: await this.findAll(),
    });
  }
}
