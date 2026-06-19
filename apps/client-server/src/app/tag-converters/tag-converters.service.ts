import { Injectable, Optional } from '@nestjs/common';
import { TagConverter, TagConverterRepository } from '@postybirb/database';
import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { DynamicObject, EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { Website } from '../websites/website';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';

@Injectable()
export class TagConvertersService extends PostyBirbService<TagConverterRepository> {
  constructor(@Optional() webSocket?: WSGateway) {
    super(new TagConverterRepository(), webSocket);
    this.repository.subscribe('TagConverterSchema', () => {
      this.emit();
    });
  }

  async create(createDto: CreateTagConverterDto): Promise<TagConverter> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating TagConverter '${createDto.tag}'`);
    await this.throwIfExists(eq(this.table.tag, createDto.tag));
    return this.repository.insert(createDto);
  }

  update(id: EntityId, update: UpdateTagConverterDto) {
    this.logger.withMetadata(update).info(`Updating TagConverter '${id}'`);
    return this.repository.update(id, update);
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
      where: { tag: { in: tags } },
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

  protected async emit() {
    super.emit({
      event: TAG_CONVERTER_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }
}
