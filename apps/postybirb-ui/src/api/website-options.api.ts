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
    super('submission-option');
  }

  validate(dto: IValidateWebsiteOptionsDto) {
    return this.client.post<ValidationResult>('validate', dto);
  }
}

export default new WebsiteOptionsApi();
