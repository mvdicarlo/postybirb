import { ISubmissionDto } from '@postybirb/dto';
import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

export async function fetchAndMergeSubmission(
  submission: SubmissionDto,
  mergeFields: Array<keyof SubmissionDto>
) {
  const fetchedSubmission = await SubmissionsApi.get(submission.id).then(
    (value) => new SubmissionDto(value.body)
  );

  mergeFields.forEach((field) => {
    // eslint-disable-next-line no-param-reassign
    submission[field] = fetchedSubmission[field] as never;
  });
}

export function mergeSubmission(
  original: SubmissionDto,
  merge: ISubmissionDto,
  mergeFields: Array<keyof SubmissionDto>
) {
  mergeFields.forEach((field) => {
    // eslint-disable-next-line no-param-reassign
    original[field] = (merge as SubmissionDto)[field] as never;
  });
}
