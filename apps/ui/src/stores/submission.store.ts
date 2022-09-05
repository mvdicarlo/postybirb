import { ISubmissionDto } from '@postybirb/dto';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { IBaseSubmissionMetadata } from '@postybirb/types';
import SubmissionsApi from '../api/submission.api';
import StoreManager from './store-manager';

export const SubmissionStore: StoreManager<
  ISubmissionDto<IBaseSubmissionMetadata>
> = new StoreManager<ISubmissionDto<IBaseSubmissionMetadata>>(
  SUBMISSION_UPDATES,
  () => SubmissionsApi.getAll().then(({ body }) => body)
);
