import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { PostService } from './post.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post')
@Controller('post')
export class PostController extends PostyBirbController<'PostRecordSchema'> {
  constructor(readonly service: PostService) {
    super(service);
  }

  /**
   * Get all events for a specific post record.
   * Returns the immutable event ledger showing all posting actions.
   *
   * @param {EntityId} id - The post record ID
   * @returns {Promise<PostEventDto[]>} Array of post events
   */
  @Get(':id/events')
  @ApiOkResponse({ description: 'Events for the post record.' })
  async getEvents(@Param('id') id: EntityId) {
    return this.service.getEvents(id);
  }
}
