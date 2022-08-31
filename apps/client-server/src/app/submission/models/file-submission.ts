import { Submission } from '../entities/submission.entity';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from './base-submission-metadata';

export type FileSubmissionFileReference = {
  primary: string;
  primarySkipWebsites: string[];
  thumbnail?: string;
  thumbnailSkipWebsites: string[];
};

export interface FileSubmissionMetadata extends IBaseSubmissionMetadata {
  thumbnail?: string; // The Id of the file
}

export type FileSubmission = Submission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: Submission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
