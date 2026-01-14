import {
  ICreateWebsiteOptionsDto,
  IUpdateSubmissionWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto,
  IValidateWebsiteOptionsDto,
  SubmissionId,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class WebsiteOptionsApi extends BaseApi<
  WebsiteOptionsDto,
  ICreateWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto
> {
  constructor() {
    super('website-option');
  }

  validate(dto: IValidateWebsiteOptionsDto) {
    return this.client.post<ValidationResult>('validate', dto);
  }

  validateSubmission(submissionId: SubmissionId) {
    return this.client.get<ValidationResult[]>(`validate/${submissionId}`);
  }

  updateSubmissionOptions(
    id: SubmissionId,
    dto: IUpdateSubmissionWebsiteOptionsDto,
  ) {
    return this.client.patch<WebsiteOptionsDto>(`submission/${id}`, dto);
  }

  modifySubmission(
    submissionId: SubmissionId,
    dto: IUpdateSubmissionWebsiteOptionsDto,
  ) {
    return this.client.patch<WebsiteOptionsDto>(
      `submission/${submissionId}`,
      dto,
    );
  }
}

export default new WebsiteOptionsApi();
