import { Injectable, Optional } from '@nestjs/common';
import { PostyBirbService } from '../common/service/postybirb-service';
import { WSGateway } from '../web-socket/web-socket-gateway';

/**
 * Simple entity service for post records.
 * @class PostService
 */
@Injectable()
export class PostService extends PostyBirbService<'PostRecordSchema'> {
  constructor(@Optional() webSocket?: WSGateway) {
    super('PostRecordSchema', webSocket);
  }
}
