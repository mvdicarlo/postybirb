import { ISubmissionDto } from '@postybirb/dto';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import SubmissionsApi from '../api/submission.api';
import StoreManager from './store-manager';

export const SubmissionStore: StoreManager<ISubmissionDto<any>> =
  new StoreManager<ISubmissionDto<any>>(SUBMISSION_UPDATES, () =>
    SubmissionsApi.getAll().then(({ body }) => body)
  );
