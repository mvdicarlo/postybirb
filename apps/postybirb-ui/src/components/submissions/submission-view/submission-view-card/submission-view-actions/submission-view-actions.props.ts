import { SubmissionType } from '@postybirb/types';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

export type SubmissionViewActionProps = {
  submissions: SubmissionDto[];
  selected: SubmissionDto[];
  type: SubmissionType;
  onSelect(submissions: SubmissionDto[]): void;
};
