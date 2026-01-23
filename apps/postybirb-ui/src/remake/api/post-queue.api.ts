import { IPostQueueActionDto, PostQueueRecordDto, PostRecordResumeMode } from '@postybirb/types';
import { BaseApi } from './base.api';

class PostQueueApi extends BaseApi<
  PostQueueRecordDto,
  IPostQueueActionDto,
  IPostQueueActionDto
> {
  constructor() {
    super('post-queue');
  }

  enqueue(submissionIds: string[], resumeMode?: PostRecordResumeMode) {
    return this.client.post('enqueue', { submissionIds, resumeMode });
  }

  dequeue(submissionIds: string[]) {
    return this.client.post('dequeue', { submissionIds });
  }
  
  getAll() {
    return this.client.get<PostQueueRecordDto[]>();
  }

  isPaused() {
    return this.client.get<{ paused: boolean }>('is-paused');
  }

  pause() {
    return this.client.post<{ paused: boolean }>('pause', {});
  }

  resume() {
    return this.client.post<{ paused: boolean }>('resume', {});
  }
}

export default new PostQueueApi();
