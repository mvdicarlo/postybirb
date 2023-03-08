import SubmissionsApi from '../../../../../api/submission.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

export async function fetchAndMergeSubmission(
  submission: SubmissionDto,
  mergeField: keyof SubmissionDto
) {
  const fetchedSubmission = await SubmissionsApi.get(submission.id).then(
    (value) => new SubmissionDto(value.body)
  );
  // eslint-disable-next-line no-param-reassign
  submission[mergeField] = fetchedSubmission[mergeField] as never;
}
