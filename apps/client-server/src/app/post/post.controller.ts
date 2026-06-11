import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { Response } from 'express';
import { RelayPostManager } from './engine/post-manager.service';
import { RelayPreviewService } from './engine/preview.service';
import { RelayTracer } from './engine/tracer.service';

/**
 * Read + preview endpoints for the Relay posting engine.
 */
@ApiTags('post')
@Controller('post')
export class PostController {
  constructor(
    private readonly previewService: RelayPreviewService,
    private readonly relayPostManager: RelayPostManager,
    private readonly tracer: RelayTracer,
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

  /**
   * Download a NDJSON log archive for a submission: the concatenation of
   * every persisted job's trace log (one job per "----- jobId: <id> -----"
   * separator). Falls back to the in-memory ring buffer for jobs whose
   * disk file has not been flushed (e.g. jobs that crashed before append).
   *
   * Sent as a `text/x-ndjson` attachment so the browser triggers a save.
   */
  @Get(':id/logs')
  @ApiOkResponse({ description: 'NDJSON debug log for a submission.' })
  async downloadLogs(
    @Param('id') id: EntityId,
    @Res() response: Response,
  ): Promise<void> {
    const jobs = await this.relayPostManager.getHistory(id);
    const parts: string[] = [];
    for (const job of jobs) {
      // eslint-disable-next-line no-await-in-loop
      let body = await this.tracer.readDiskLog(job.id);
      if (!body) {
        // Fall back to whatever the in-memory ring buffer has.
        body = this.tracer
          .getEntries(job.id)
          .map((e) => JSON.stringify(e))
          .join('\n');
        if (body) body += '\n';
      }
      parts.push(`# job ${job.id} (${job.status})\n${body}`);
    }
    const content = parts.length === 0 ? '' : parts.join('\n');
    const filename = `postybirb-post-${id}.ndjson`;
    response.set({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(content, 'utf-8'),
    });
    response.send(content);
  }
}
