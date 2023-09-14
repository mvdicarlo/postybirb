import {
  ICreateSubmissionDto,
  ISubmissionDto,
  IUpdateSubmissionDto,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class SubmissionsApi extends BaseApi<
  ISubmissionDto,
  ICreateSubmissionDto,
  IUpdateSubmissionDto
> {
  constructor() {
    super('submission');
  }

  createMessageSubmission(name: string) {
    this.client.post('', {
      name,
      type: SubmissionType.MESSAGE,
    });
  }

  duplicate(id: SubmissionId) {
    return this.client.post(`duplicate/${id}`);
  }
}

export default new SubmissionsApi();
