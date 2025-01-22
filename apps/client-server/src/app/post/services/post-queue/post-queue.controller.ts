import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../../../common/controller/postybirb-controller';
import { PostQueueRecord } from '../../../drizzle/models';
import { PostQueueActionDto } from '../../dtos/post-queue-action.dto';
import { PostQueueService } from './post-queue.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post-queue')
@Controller('post-queue')
export class PostQueueController extends PostyBirbController<PostQueueRecord> {
  constructor(readonly service: PostQueueService) {
    super(service);
  }

  @Post('enqueue')
  @ApiOkResponse({ description: 'Post(s) queued.' })
  async enqueue(@Body() request: PostQueueActionDto) {
    return this.service.enqueue(request.submissionIds);
  }

  @Post('dequeue')
  @ApiOkResponse({ description: 'Post(s) dequeued.' })
  async dequeue(@Body() request: PostQueueActionDto) {
    this.service.dequeue(request.submissionIds);
  }
}
