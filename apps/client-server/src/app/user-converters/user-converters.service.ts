import { Injectable, Optional } from '@nestjs/common';
import { USER_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbService } from '../common/service/postybirb-service';
import { UserConverter } from '../drizzle/models';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { Website } from '../websites/website';
import { CreateUserConverterDto } from './dtos/create-user-converter.dto';
import { UpdateUserConverterDto } from './dtos/update-user-converter.dto';

@Injectable()
export class UserConvertersService extends PostyBirbService<'UserConverterSchema'> {
  constructor(@Optional() webSocket?: WSGateway) {
    super('UserConverterSchema', webSocket);
    this.repository.subscribe('UserConverterSchema', () => {
      this.emit();
    });
  }

  async create(createDto: CreateUserConverterDto): Promise<UserConverter> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating UserConverter '${createDto.username}'`);
    await this.throwIfExists(eq(this.schema.username, createDto.username));
    return this.repository.insert(createDto);
  }

  update(id: EntityId, update: UpdateUserConverterDto) {
    this.logger.withMetadata(update).info(`Updating UserConverter '${id}'`);
    return this.repository.update(id, update);
  }

  /**
   * Converts a username using user defined conversion table.
   *
   * @param {Website<unknown>} instance
   * @param {string} username
   * @return {*}  {Promise<string>}
   */
  async convert(instance: Website<unknown>, username: string): Promise<string> {
    const converter = await this.repository.findOne({
      where: (converter, { eq: eqFn }) => eqFn(converter.username, username),
    });
    
    if (!converter) {
      return username;
    }
    
    return (
      converter.convertTo[instance.decoratedProps.metadata.name] ??
      converter.convertTo.default ??
      username
    );
  }

  protected async emit() {
    super.emit({
      event: USER_CONVERTER_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }
}
