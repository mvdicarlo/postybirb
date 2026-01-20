import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../../../common/controller/postybirb-controller';
import { PostQueueActionDto } from '../../dtos/post-queue-action.dto';
import { PostQueueService } from './post-queue.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post-queue')
@Controller('post-queue')
export class PostQueueController extends PostyBirbController<'PostQueueRecordSchema'> {
  constructor(readonly service: PostQueueService) {
    super(service);
  }

  @Post('enqueue')
  @ApiOkResponse({ description: 'Post(s) queued.' })
  async enqueue(@Body() request: PostQueueActionDto) {
    return this.service.enqueue(request.submissionIds, request.resumeMode);
  }

  @Post('dequeue')
  @ApiOkResponse({ description: 'Post(s) dequeued.' })
  async dequeue(@Body() request: PostQueueActionDto) {
    this.service.dequeue(request.submissionIds);
  }

  @Get('is-paused')
  @ApiOkResponse({ description: 'Get if queue is paused.' })
  async isPaused() {
    return { paused: await this.service.isPaused() };
  }

  @Post('pause')
  @ApiOkResponse({ description: 'Queue paused.' })
  async pause() {
    await this.service.pause();
    return { paused: true };
  }

  @Post('resume')
  @ApiOkResponse({ description: 'Queue resumed.' })
  async resume() {
    await this.service.resume();
    return { paused: false };
  }
}
