import {
  ICreateSubmissionTemplateDto,
  ISubmissionTemplateDto,
  IUpdateSubmissionTemplateDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class SubmissionTemplatesApi extends BaseApi<
  ISubmissionTemplateDto,
  ICreateSubmissionTemplateDto,
  IUpdateSubmissionTemplateDto
> {
  constructor() {
    super('submission-templates');
  }
}

export default new SubmissionTemplatesApi();
