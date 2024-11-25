import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { TagConverter } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { Website } from '../websites/website';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';

@Injectable()
export class TagConvertersService extends PostyBirbService<TagConverter> {
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(TagConverter)
    repository: PostyBirbRepository<TagConverter>,
    @Optional() webSocket?: WSGateway,
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [TagConverter], () =>
      this.emit(),
    );
  }

  async create(createDto: CreateTagConverterDto): Promise<TagConverter> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagConverter '${createDto.tag}'`);
    await this.throwIfExists({ tag: createDto.tag });
    const tagConverter = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagConverter);
    return tagConverter;
  }

  update(id: string, update: UpdateTagConverterDto) {
    this.logger.withMetadata(update).info(`Updating TagConverter '${id}'`);
    return this.repository.update(id, update);
  }

  // TODO - write tests for this
  /**
   * Converts a list of tags using user defined conversion table.
   *
   * @param {Website<unknown>} instance
   * @param {string[]} tags
   * @return {*}  {Promise<string[]>}
   */
  async convert(instance: Website<unknown>, tags: string[]): Promise<string[]> {
    const converters = await this.repository.find({ tag: { $in: tags } });
    return tags.map((tag) => {
      const converter = converters.find((c) => c.tag === tag);
      if (!converter) {
        return tag;
      }
      return (
        converter.convertTo[instance.decoratedProps.metadata.name] ??
        converter.convertTo.default ?? // NOTE: This is not currently used, but it's here for future proofing
        tag
      );
    });
  }

  protected async emit() {
    super.emit({
      event: TAG_CONVERTER_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toJSON()),
    });
  }
}
