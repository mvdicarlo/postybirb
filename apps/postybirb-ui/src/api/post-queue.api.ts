import { IPostQueueActionDto, PostQueueRecordDto } from '@postybirb/types';
import { BaseApi } from './base.api';

class PostQueueApi extends BaseApi<
  PostQueueRecordDto,
  IPostQueueActionDto,
  IPostQueueActionDto
> {
  constructor() {
    super('post-queue');
  }

  enqueue(ids: string[]) {
    return this.client.post('enqueue', { ids });
  }

  dequeue(ids: string[]) {
    return this.client.post('dequeue', { ids });
  }
}

export default new PostQueueApi();
