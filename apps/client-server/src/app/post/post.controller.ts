import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { PostService } from './post.service';

/**
 * Queue operations for Post data.
 * @class PostController
 */
@ApiTags('post')
@Controller('post')
export class PostController extends PostyBirbController<'PostRecordSchema'> {
  constructor(readonly service: PostService) {
    super(service);
  }
}
