import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { PostRecord } from '../database/entities';
import { QueuePostRecordRequestDto } from './dtos/queue-post-record.dto';
import { PostService } from './post.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post')
@Controller('post')
export class PostController extends PostyBirbController<PostRecord> {
  constructor(readonly service: PostService) {
    super(service);
  }

  @Post('enqueue')
  @ApiOkResponse({ description: 'Post(s) queued.' })
  async enqueue(@Body() request: QueuePostRecordRequestDto) {
    return this.service.enqueue(request);
  }

  @Post('dequeue')
  @ApiOkResponse({ description: 'Post(s) dequeued.' })
  async dequeue(@Body() request: QueuePostRecordRequestDto) {
    this.service.dequeue(request);
  }
}
