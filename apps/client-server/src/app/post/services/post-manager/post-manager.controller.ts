import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { PostQueueService } from '../post-queue/post-queue.service';
import { PostManagerService } from './post-manager.service';

@ApiTags('post-manager')
@Controller('post-manager')
export class PostManagerController {
  constructor(
    readonly service: PostManagerService,
    private readonly postQueueService: PostQueueService,
  ) {}

  @Post('cancel/:id')
  @ApiOkResponse({ description: 'Post cancelled if running.' })
  async cancelIfRunning(@Param('id') id: SubmissionId) {
    // Use post-queue's dequeue which ensures all db records are properly handled
    await this.postQueueService.dequeue([id]);
    return true;
  }

  @Get('is-posting')
  @ApiOkResponse({ description: 'Check if a post is in progress.' })
  async isPosting() {
    return { isPosting: this.service.isPosting() };
  }
}
