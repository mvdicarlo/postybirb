import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { PostManagerRegistry } from './services/post-manager-v2/post-manager-registry.service';
import { PostService } from './post.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post')
@Controller('post')
export class PostController extends PostyBirbController<'PostRecordSchema'> {
  constructor(
    readonly service: PostService,
    private readonly postManagerRegistry: PostManagerRegistry,
  ) {
    super(service);
  }

  /**
   * Get active wait states for rate-limited websites.
   * Computed from in-memory data — no DB access.
   * Used by the UI to show countdown timers on page load/reload.
   */
  @Get('active/wait-states')
  @ApiOkResponse({ description: 'Currently active rate-limit wait states.' })
  getWaitStates() {
    return this.postManagerRegistry.getWaitStates();
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
