import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { PostQueueService } from '../post-queue/post-queue.service';
import { PostManagerService } from './post-manager.service';

class CancelPostDto {
  submissionId: SubmissionId;
}

@ApiTags('post-manager')
@Controller('post-manager')
export class PostManagerController {
  constructor(
    readonly service: PostManagerService,
    private readonly postQueueService: PostQueueService,
  ) {}

  @Post('cancel')
  @ApiOkResponse({ description: 'Post cancelled if running.' })
  async cancelIfRunning(@Body() request: CancelPostDto) {
    // Use post-queue's dequeue which ensures all db records are properly handled
    await this.postQueueService.dequeue([request.submissionId]);
    return true;
  }
  
  @Get('is-posting')
  @ApiOkResponse({ description: 'Check if a post is in progress.' })
  async isPosting() {
    return { isPosting: this.service.isPosting() };
  }
}