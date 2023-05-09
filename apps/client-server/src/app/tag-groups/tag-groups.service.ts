import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { TagGroup } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { UpdateTagGroupDto } from './dtos/update-tag-group.dto';

@Injectable()
export class TagGroupsService extends PostyBirbService<TagGroup> {
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(TagGroup)
    repository: PostyBirbRepository<TagGroup>,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [TagGroup], () => this.emit());
  }

  async create(createDto: CreateTagGroupDto): Promise<TagGroup> {
    this.logger.info(createDto, `Creating TagGroup '${createDto.name}'`);
    const existing = await this.repository.findOne({ name: createDto.name });
    if (existing) {
      throw new BadRequestException(
        `A tag group with name '${createDto.name}' already exists.`
      );
    }
    const tagGroup = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagGroup);
    return tagGroup;
  }

  async update(id: string, update: UpdateTagGroupDto) {
    this.logger.info(update, `Updating TagGroup '${id}'`);
    return this.repository.update(id, update);
  }

  remove(id: string) {
    this.logger.info({}, `Removing TagGroup '${id}'`);
    return this.repository.delete(id);
  }

  /**
   * Emits tag group state and data onto websocket.
   */
  protected async emit() {
    super.emit({
      event: TAG_GROUP_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toJSON()),
    });
  }
}
