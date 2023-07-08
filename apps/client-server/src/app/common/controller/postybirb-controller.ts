import { Delete, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PostyBirbEntity } from '../../database/entities/postybirb-entity';
import { PostyBirbService } from '../service/postybirb-service';

/**
 * Base PostyBirb controller logic that should be good for most rest calls.
 *
 * @class PostyBirbController
 */
export abstract class PostyBirbController<T extends PostyBirbEntity> {
  constructor(protected readonly service: PostyBirbService<T>) {}

  @Get(':id')
  @ApiOkResponse({ description: 'Record by Id.' })
  findOne(@Param('id') id: string) {
    return this.service
      .findById(id, { failOnMissing: true })
      .then((record) => record.toJSON());
  }

  @Get()
  @ApiOkResponse({ description: 'A list of all records.' })
  findAll() {
    return this.service
      .findAll()
      .then((records) => records.map((record) => record.toJSON()));
  }

  @Delete()
  @ApiOkResponse({
    description: 'Records removed.',
  })
  async remove(@Query('ids') ids: string | string[]) {
    return Promise.all(
      (Array.isArray(ids) ? ids : [ids]).map((id) => this.service.remove(id))
    ).then(() => ({
      success: true,
    }));
  }
}
