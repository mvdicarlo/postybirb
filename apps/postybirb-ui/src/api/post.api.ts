import { IPostWaitState, IQueuePostRecordRequestDto, PostRecordDto } from '@postybirb/types';
import { BaseApi } from './base.api';

class PostApi extends BaseApi<
  PostRecordDto,
  IQueuePostRecordRequestDto,
  IQueuePostRecordRequestDto
> {
  constructor() {
    super('post');
  }

  getWaitStates() {
    return this.client.get<IPostWaitState[]>('active/wait-states');
  }
}

export default new PostApi();
