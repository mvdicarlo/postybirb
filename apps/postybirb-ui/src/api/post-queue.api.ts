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

  enqueue(submissionIds: string[]) {
    return this.client.post('enqueue', { submissionIds });
  }

  dequeue(submissionIds: string[]) {
    return this.client.post('dequeue', { submissionIds });
  }
}

export default new PostQueueApi();
