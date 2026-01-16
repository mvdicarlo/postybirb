import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { PostManagerRegistry } from '../post-manager-v2';
import { PostQueueService } from '../post-queue/post-queue.service';

@ApiTags('post-manager')
@Controller('post-manager')
export class PostManagerController {
  constructor(
    readonly service: PostManagerRegistry,
    private readonly postQueueService: PostQueueService,
  ) {}

  @Post('cancel/:id')
  @ApiOkResponse({ description: 'Post cancelled if running.' })
  async cancelIfRunning(@Param('id') id: SubmissionId) {
    // Use post-queue's dequeue which ensures all db records are properly handled
    await this.postQueueService.dequeue([id]);
    return true;
  }

  @Get('is-posting/:submissionType')
  @ApiOkResponse({ description: 'Check if a post is in progress.' })
  async isPosting(@Param('submissionType') submissionType: SubmissionType) {
    return { isPosting: this.service.getManager(submissionType).isPosting() };
  }
}
