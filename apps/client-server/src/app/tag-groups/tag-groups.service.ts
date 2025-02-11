import { Injectable, Optional } from '@nestjs/common';
import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { TagGroup } from '../drizzle/models';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';

@Injectable()
export class TagGroupsService extends PostyBirbService<'TagGroupSchema'> {
  constructor(@Optional() webSocket?: WSGateway) {
    super('TagGroupSchema', webSocket);
    this.repository.subscribe('TagGroupSchema', () => this.emit());
  }

  async create(createDto: CreateTagGroupDto): Promise<TagGroup> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagGroup '${createDto.name}'`);
    await this.throwIfExists(eq(this.schema.name, createDto.name));
    return this.repository.insert(createDto);
  }

  update(id: EntityId, update: UpdateTagGroupDto) {
    this.logger.withMetadata(update).info(`Updating TagGroup '${id}'`);
    return this.repository.update(id, update);
  }

  protected async emit() {
    super.emit({
      event: TAG_GROUP_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }
}
