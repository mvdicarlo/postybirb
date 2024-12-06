import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { PostyBirbService } from '../common/service/postybirb-service';
import { PostRecord } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WSGateway } from '../web-socket/web-socket-gateway';

/**
 * Simple entity service for post records.
 * @class PostService
 */
@Injectable()
export class PostService extends PostyBirbService<PostRecord> {
  constructor(
    @InjectRepository(PostRecord)
    repository: PostyBirbRepository<PostRecord>,
    @Optional() webSocket?: WSGateway,
  ) {
    super(repository, webSocket);
  }
}
