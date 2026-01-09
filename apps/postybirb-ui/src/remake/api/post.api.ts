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
}

export default new PostApi();
