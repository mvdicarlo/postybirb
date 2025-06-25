import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { ISubmissionDto } from '@postybirb/types';
import submissionsApi from '../api/submission.api';
import { SubmissionDto } from '../models/dtos/submission.dto';
import StoreManager from './store-manager';

const filter = (submission: SubmissionDto | ISubmissionDto) =>
  Boolean(submission.isMultiSubmission);

export const MultiSubmissionStore: StoreManager<SubmissionDto> =
  new StoreManager<SubmissionDto>(
    SUBMISSION_UPDATES,
    () =>
      submissionsApi
        .getAll()
        .then(({ body }) =>
          body.filter(filter).map((d) => new SubmissionDto(d)),
        ),
    { ModelConstructor: SubmissionDto, filter },
  );
