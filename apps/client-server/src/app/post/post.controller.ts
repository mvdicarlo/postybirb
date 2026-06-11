import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { RelayPostManager } from './engine/post-manager.service';
import { RelayPreviewService } from './engine/preview.service';

/**
 * Read + preview endpoints for the Relay posting engine.
 */
@ApiTags('post')
@Controller('post')
export class PostController {
  constructor(
    private readonly previewService: RelayPreviewService,
    private readonly relayPostManager: RelayPostManager,
  ) {}

  /**
   * Snapshot of all currently-active Relay job trees. The UI seeds its
   * posting-state store with this on load/reconnect; live updates then arrive
   * via POST_STATE_DELTA WebSocket events.
   */
  @Get('jobs/active')
  @ApiOkResponse({ description: 'Currently active posting job trees.' })
  getActiveJobs() {
    return this.relayPostManager.getActiveTrees();
  }

  /**
   * Dry-run preview: runs resolve + file processing for a submission without
   * posting. Returns per-website resize results.
   */
  @Get(':id/preview')
  @ApiOkResponse({ description: 'Dry-run preview of a submission post.' })
  async preview(@Param('id') id: EntityId) {
    return this.previewService.preview(id);
  }

  /**
   * Relay posting history for a submission: every persisted job tree (newest
   * first), with any in-flight job overlaid from memory.
   */
  @Get(':id/jobs')
  @ApiOkResponse({ description: 'Posting job-tree history for the submission.' })
  async getJobHistory(@Param('id') id: EntityId) {
    return this.relayPostManager.getHistory(id);
  }
}
