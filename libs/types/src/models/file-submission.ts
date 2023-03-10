import { SubmissionType } from '../enums';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmission } from './submission';

export type FileSubmissionMetadata = IBaseSubmissionMetadata & {
  order: string[];
};

export type FileSubmission = ISubmission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: ISubmission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
