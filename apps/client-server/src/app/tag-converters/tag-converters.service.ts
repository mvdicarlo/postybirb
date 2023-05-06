import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { TagConverter } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';

// TODO refactor

@Injectable()
export class TagConvertersService extends PostyBirbService<TagConverter> {
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(TagConverter)
    repository: PostyBirbRepository<TagConverter>,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [TagConverter], () =>
      this.emit()
    );
  }

  async create(createDto: CreateTagConverterDto): Promise<TagConverter> {
    const tagConverter = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagConverter);
    return tagConverter;
  }

  remove(id: string) {
    this.logger.info({}, `Removing TagConverter '${id}'`);
    return this.repository.delete(id);
  }

  async update(update: UpdateTagConverterDto): Promise<boolean> {
    const tagConverter: TagConverter = await this.repository.findOne(update.id);
    tagConverter.convertTo = update.convertTo;
    tagConverter.tag = update.tag;

    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  /**
   * Emits tag group state and data onto websocket.
   */
  protected async emit() {
    super.emit({
      event: TAG_CONVERTER_UPDATES,
      data: await this.findAll(),
    });
  }
}
