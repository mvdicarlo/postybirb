import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { IBaseSubmissionMetadata } from '@postybirb/types';
import SubmissionsApi from '../api/submission.api';
import { SubmissionDto } from '../models/dtos/submission.dto';
import StoreManager from './store-manager';

export const SubmissionStore: StoreManager<
  SubmissionDto<IBaseSubmissionMetadata>
> = new StoreManager<SubmissionDto<IBaseSubmissionMetadata>>(
  SUBMISSION_UPDATES,
  () =>
    SubmissionsApi.getAll().then(({ body }) =>
      body.map((d) => new SubmissionDto(d))
    ),
  SubmissionDto
);
