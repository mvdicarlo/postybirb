import {
  ICreateWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto,
  IValidateWebsiteOptionsDto,
  IWebsiteFormFields,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class WebsiteOptionsApi extends BaseApi<
  WebsiteOptionsDto,
  ICreateWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto<IWebsiteFormFields>
> {
  constructor() {
    super('website-option');
  }

  validate(dto: IValidateWebsiteOptionsDto) {
    return this.client.post<ValidationResult>('validate', dto);
  }

  validateSubmission(submissionId: string) {
    return this.client.get<ValidationResult[]>(`validate/${submissionId}`);
  }
}

export default new WebsiteOptionsApi();
