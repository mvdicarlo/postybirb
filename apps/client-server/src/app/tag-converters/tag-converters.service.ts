import { BaseEntity, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { Constructor } from 'type-fest';
import { OnDatabaseUpdate } from '../common/service/modifiers/on-database-update';
import { PostyBirbCRUDService } from '../common/service/postybirb-crud-service';
import { TagConverter } from '../database/entities';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';

@Injectable()
export class TagConvertersService
  extends PostyBirbCRUDService<TagConverter>
  implements OnDatabaseUpdate
{
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    moduleRef: ModuleRef,
    @InjectRepository(TagConverter)
    repository: EntityRepository<TagConverter>,
    @Optional() webSocket?: WSGateway
  ) {
    super(moduleRef, repository, webSocket);
  }

  getRegisteredEntities(): Constructor<TagConverter>[] {
    return [TagConverter];
  }

  onDatabaseUpdate() {
    this.emit();
  }

  async create(createDto: CreateTagConverterDto): Promise<TagConverter> {
    const tagConverter = this.repository.create(createDto);
    await this.repository.persistAndFlush(tagConverter);
    return tagConverter;
  }

  async update(update: UpdateTagConverterDto): Promise<boolean> {
    const tagConverter: TagConverter = await this.findOne(update.id);
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
