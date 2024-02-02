import { IQueuePostRecordRequestDto, PostRecordDto } from '@postybirb/types';
import { BaseApi } from './base.api';

class PostApi extends BaseApi<
  PostRecordDto,
  IQueuePostRecordRequestDto,
  IQueuePostRecordRequestDto
> {
  constructor() {
    super('post');
  }

  enqueue(ids: string[]) {
    return this.client.post<string[]>('enqueue', { ids });
  }

  dequeue(ids: string[]) {
    return this.client.post<undefined>('dequeue', { ids });
  }
}

export default new PostApi();
