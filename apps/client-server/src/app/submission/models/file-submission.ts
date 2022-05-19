import { Submission } from '../entities/submission.entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata';

export type FileSubmissionFileReference = {
  primary: string;
  primarySkipWebsites: string[];
  thumbnail?: string;
  thumbnailSkipWebsites: string[];
};

export interface FileSubmissionMetadata extends IBaseSubmissionMetadata {
  files: FileSubmissionFileReference[];
}

export type FileSubmission = Submission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: Submission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return (
    submission && (submission as FileSubmission).metadata?.files !== undefined
  );
}
