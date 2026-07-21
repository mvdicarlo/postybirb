import { Controller, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { PostQueueService } from '../post-queue/post-queue.service';

/**
 * Cancellation endpoint for in-progress posts. Delegates to the queue's
 * dequeue, which cancels the Relay job and removes the queue record.
 */
@ApiTags('post-manager')
@Controller('post-manager')
export class PostManagerController {
  constructor(private readonly postQueueService: PostQueueService) {}

  @Post('cancel/:id')
  @ApiOkResponse({ description: 'Post cancelled if running.' })
  async cancelIfRunning(@Param('id') id: SubmissionId) {
    await this.postQueueService.dequeue([id]);
    return true;
  }
}
