import { SubmissionType } from '../enums';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmission } from './submission';

type WebsiteFileDimension = {
  fileId: string;
  height: number;
  width: number;
};

export type FileModifications = {
  altText: string;
  dimensions: Record<string | 'default', WebsiteFileDimension>;
  ignoredWebsites: string[];
};

type FileSpecificMetadata = Record<string, FileModifications>; // <fileId, altText>

export type FileSubmissionMetadata = IBaseSubmissionMetadata & {
  order: string[];

  /**
   * Stores file specific metadata modifications (i.e. h/w alt text).
   */
  modifiedFiles: FileSpecificMetadata;
};

export type FileSubmission = ISubmission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: ISubmission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
