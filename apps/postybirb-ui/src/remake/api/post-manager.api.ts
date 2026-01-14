import { SubmissionId } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class PostManagerApi {
  private readonly client: HttpClient;

  constructor() {
    this.client = new HttpClient('post-manager');
  }

  cancelIfRunning(submissionId: SubmissionId) {
    return this.client.post<boolean>(`cancel/${submissionId}`, {});
  }

  isPosting() {
    return this.client.get<{ isPosting: boolean }>('is-posting');
  }
}

export default new PostManagerApi();
