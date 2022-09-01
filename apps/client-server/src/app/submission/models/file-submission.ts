import { Submission } from '../../database/entities';
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
  order: string[];
}

export type FileSubmission = Submission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: Submission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
