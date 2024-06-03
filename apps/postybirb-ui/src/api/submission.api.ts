import {
  ICreateSubmissionDto,
  ISubmissionDto,
  IUpdateSubmissionDto,
  IUpdateSubmissionTemplateNameDto,
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

  updateTemplateName(id: SubmissionId, dto: IUpdateSubmissionTemplateNameDto) {
    return this.client.patch(`template/${id}`, dto);
  }

  createFileSubmission(type: SubmissionType, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', type);
    return this.client.post('', formData);
  }
}

export default new SubmissionsApi();
