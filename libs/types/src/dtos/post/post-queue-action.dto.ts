import { PostRecordResumeMode } from '../../enums';
import { SubmissionId } from '../../models';

export type IPostQueueActionDto = {
  submissionIds: SubmissionId[];
  resumeMode?: PostRecordResumeMode;
};
