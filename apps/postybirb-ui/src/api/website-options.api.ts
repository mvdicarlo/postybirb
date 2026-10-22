import {
  CreateWebsiteOptionsDto,
  IDescriptionPreviewResult,
  PreviewDescriptionDto,
  UpdateSubmissionWebsiteOptionsDto,
  UpdateWebsiteOptionsDto,
  ValidateWebsiteOptionsDto,
  SubmissionId,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class WebsiteOptionsApi extends BaseApi<
  WebsiteOptionsDto,
  CreateWebsiteOptionsDto,
  UpdateWebsiteOptionsDto
> {
  constructor() {
    super('website-option');
  }

  validate(dto: ValidateWebsiteOptionsDto) {
    return this.client.post<ValidationResult>('validate', dto);
  }

  validateSubmission(submissionId: SubmissionId) {
    return this.client.get<ValidationResult[]>(`validate/${submissionId}`);
  }

  previewDescription(dto: PreviewDescriptionDto) {
    return this.client.post<IDescriptionPreviewResult>(
      'preview-description',
      dto,
    );
  }

  updateSubmissionOptions(
    id: SubmissionId,
    dto: UpdateSubmissionWebsiteOptionsDto,
  ) {
    return this.client.patch<WebsiteOptionsDto>(`submission/${id}`, dto);
  }

  modifySubmission(
    submissionId: SubmissionId,
    dto: UpdateSubmissionWebsiteOptionsDto,
  ) {
    return this.client.patch<WebsiteOptionsDto>(
      `submission/${submissionId}`,
      dto,
    );
  }
}

export default new WebsiteOptionsApi();
