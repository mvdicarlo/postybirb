import {
  ICreateSubmissionDto,
  ISubmissionDto,
  IUpdateSubmissionDto,
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
}

export default new SubmissionsApi();
