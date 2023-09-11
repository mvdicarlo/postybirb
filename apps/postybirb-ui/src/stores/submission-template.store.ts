import { SUBMISSION_TEMPLATE_UPDATES } from '@postybirb/socket-events';
import { ISubmissionTemplateDto } from '@postybirb/types';
import submissionTemplateApi from '../api/submission-templates.api';
import StoreManager from './store-manager';

export const SubmissionTemplateStore: StoreManager<ISubmissionTemplateDto> =
  new StoreManager<ISubmissionTemplateDto>(SUBMISSION_TEMPLATE_UPDATES, () =>
    submissionTemplateApi.getAll().then(({ body }) => body)
  );
