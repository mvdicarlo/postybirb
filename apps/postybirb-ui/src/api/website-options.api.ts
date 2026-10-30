import {
  CreateWebsiteOptionsDto,
  IDescriptionPreviewResult,
  PreviewDescriptionDto,
  UpdateSubmissionWebsiteOptionsDto,
  UpdateWebsiteOptionsDto,
  UpdateWebsiteDescriptionDto,
  DESCRIPTION_REVISION_CONFLICT,
  DescriptionValue,
  ValidateWebsiteOptionsDto,
  SubmissionId,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';
import { HttpError } from '../transports/http-client';

export type DescriptionSaveResult = {
  status: 'saved' | 'conflict';
  value: DescriptionValue;
};

class WebsiteOptionsApi extends BaseApi<
  WebsiteOptionsDto,
  CreateWebsiteOptionsDto,
  UpdateWebsiteOptionsDto
> {
  constructor() {
    super('website-option');
  }

  async saveDescription(
    id: string,
    update: UpdateWebsiteDescriptionDto,
  ): Promise<DescriptionSaveResult> {
    let response;
    let status: DescriptionSaveResult['status'] = 'saved';
    try {
      response = await this.client.patch<WebsiteOptionsDto>(`${id}/description`, update);
    } catch (error) {
      if (
        !(error instanceof HttpError) ||
        error.statusCode !== 409 ||
        typeof error.response.body !== 'object' ||
        error.response.body === null ||
        !('code' in error.response.body) ||
        error.response.body.code !== DESCRIPTION_REVISION_CONFLICT
      ) {
        throw error;
      }
      response = await this.get(id);
      status = 'conflict';
    }
    const { description } = response.body.data;
    if (!description) {
      throw new Error(
        // eslint-disable-next-line lingui/no-unlocalized-strings
        'The server returned no description after saving',
      );
    }
    return { status, value: description };
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
