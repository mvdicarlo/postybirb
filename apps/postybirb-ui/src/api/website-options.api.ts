import {
  ICreateWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto,
  IValidateWebsiteOptionsDto,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class WebsiteOptionsApi extends BaseApi<
  WebsiteOptionsDto,
  ICreateWebsiteOptionsDto,
  IUpdateWebsiteOptionsDto<never>
> {
  constructor() {
    super('submission-option');
  }

  validate(dto: IValidateWebsiteOptionsDto) {
    return this.client.post<ValidationResult>('validate', dto);
  }
}

export default new WebsiteOptionsApi();
