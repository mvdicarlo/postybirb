import { SubmissionType } from '@postybirb/types';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

export type SubmissionViewActionProps = {
  submissions: SubmissionDto[];
  selected: SubmissionDto[];
  type: SubmissionType;
  view: 'grid' | 'list';
  onSelect(submissions: SubmissionDto[]): void;
  setView(view: 'grid' | 'list'): void;
};
