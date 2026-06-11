import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostRecordRepository } from '@postybirb/database';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { RelayPostManager } from './engine/post-manager.service';
import { RelayPreviewService } from './engine/preview.service';
import { PostService } from './post.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post')
@Controller('post')
export class PostController extends PostyBirbController<PostRecordRepository> {
  constructor(
    readonly service: PostService,
    private readonly previewService: RelayPreviewService,
    private readonly relayPostManager: RelayPostManager,
  ) {
    super(service);
  }

  /**
   * Get a snapshot of all currently-active Relay job trees.
   * The UI seeds its posting-state store with this on load/reconnect; live
   * updates then arrive via POST_STATE_DELTA WebSocket events.
   */
  @Get('jobs/active')
  @ApiOkResponse({ description: 'Currently active posting job trees.' })
  getActiveJobs() {
    return this.relayPostManager.getActiveTrees();
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

  /**
   * Dry-run preview (Relay engine): runs plan + validate + transform for a
   * submission without posting. Returns per-website parsed/resize results.
   *
   * @param {EntityId} id - The submission ID
   */
  @Get(':id/preview')
  @ApiOkResponse({ description: 'Dry-run preview of a submission post.' })
  async preview(@Param('id') id: EntityId) {
    return this.previewService.preview(id);
  }

  /**
   * Relay posting history for a submission: every persisted job tree (newest
   * first), with any in-flight job overlaid from memory.
   *
   * @param {EntityId} id - The submission ID
   */
  @Get(':id/jobs')
  @ApiOkResponse({ description: 'Posting job-tree history for the submission.' })
  async getJobHistory(@Param('id') id: EntityId) {
    return this.relayPostManager.getHistory(id);
  }
}
