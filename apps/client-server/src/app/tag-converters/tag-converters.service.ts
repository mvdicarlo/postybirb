import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TagConverter, TagConverterRepository } from '@postybirb/database';
import { DynamicObject, EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Website } from '../websites/website';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';
import { TAG_CONVERTER_EVENT_PREFIX } from './tag-converter.events';

@Injectable()
export class TagConvertersService extends PostyBirbService<TagConverterRepository> {
  constructor(@Optional() eventEmitter?: EventEmitter2) {
    super(new TagConverterRepository());
    this.configureCrudEvents(TAG_CONVERTER_EVENT_PREFIX, eventEmitter);
  }

  async create(createDto: CreateTagConverterDto): Promise<TagConverter> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagConverter '${createDto.tag}'`);
    await this.throwIfExists(eq(this.table.tag, createDto.tag));
    const entity = await this.repository.insert(createDto);
    this.publishCreated(entity.toDTO());
    return entity;
  }

  async update(
    id: EntityId,
    update: UpdateTagConverterDto,
  ): Promise<TagConverter> {
    this.logger.withMetadata(update).info(`Updating TagConverter '${id}'`);
    const entity = await this.repository.update(id, update);
    this.publishUpdated(entity.toDTO());
    return entity;
  }

  /**
   * Converts a list of tags using user defined conversion table.
   */
  async convert(
    instance: Website<DynamicObject>,
    tags: string,
  ): Promise<string>;
  async convert(
    instance: Website<DynamicObject>,
    tags: string[],
  ): Promise<string[]>;
  async convert(
    instance: Website<DynamicObject>,
    tags: string[] | string,
  ): Promise<string[] | string> {
    if (typeof tags === 'string') {
      return (await this.convert(instance, [tags]))[0];
    }

    // { tag: { $in: tags } }
    const converters = await this.repository.find({
      where: (converter, { inArray }) => inArray(converter.tag, tags),
    });
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
}
