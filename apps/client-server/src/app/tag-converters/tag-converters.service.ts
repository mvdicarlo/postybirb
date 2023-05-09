import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { TagConverter } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';

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
    this.logger.info(createDto, `Creating TagConverter '${createDto.tag}'`);
    await this.throwIfExists({ tag: createDto.tag });
    const tagConverter = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagConverter);
    return tagConverter;
  }

  remove(id: string) {
    this.logger.info({}, `Removing TagConverter '${id}'`);
    return this.repository.delete(id);
  }

  update(id: string, update: UpdateTagConverterDto) {
    this.logger.info(update, `Updating TagConverter '${id}'`);
    return this.repository.update(id, update);
  }

  protected async emit() {
    super.emit({
      event: TAG_CONVERTER_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toJSON()),
    });
  }
}
