import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import submissionsApi from '../api/submission.api';
import { SubmissionDto } from '../models/dtos/submission.dto';
import StoreManager from './store-manager';

export const SubmissionStore: StoreManager<SubmissionDto> =
  new StoreManager<SubmissionDto>(
    SUBMISSION_UPDATES,
    () =>
      submissionsApi
        .getAll()
        .then(({ body }) => body.map((d) => new SubmissionDto(d))),
    SubmissionDto
  );
