import { Delete, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { DatabaseEntity, EntityRepository } from '@postybirb/database';
import { EntityId } from '@postybirb/types';
import { PostyBirbService } from '../service/postybirb-service';

/**
 * Base PostyBirb controller logic that should be good for most rest calls.
 * Generic over the repository class so the wrapped service's
 * `findById`/`findAll` return concretely-typed entities (with `toDTO`).
 *
 * @class PostyBirbController
 */
export abstract class PostyBirbController<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRepo extends EntityRepository<any, DatabaseEntity>,
> {
  constructor(protected readonly service: PostyBirbService<TRepo>) {}

  @Get(':id')
  @ApiOkResponse({ description: 'Record by Id.' })
  findOne(@Param('id') id: EntityId) {
    return this.service
      .findByIdOrThrow(id)
      .then((record) => record.toDTO());
  }

  @Get()
  @ApiOkResponse({ description: 'A list of all records.' })
  findAll() {
    return this.service
      .findAll()
      .then((records) => records.map((record) => record.toDTO()));
  }

  @Delete()
  @ApiOkResponse({
    description: 'Records removed.',
  })
  async remove(@Query('ids') ids: EntityId | EntityId[]) {
    return Promise.all(
      (Array.isArray(ids) ? ids : [ids]).map((id) => this.service.remove(id)),
    ).then(() => ({
      success: true,
    }));
  }
}
