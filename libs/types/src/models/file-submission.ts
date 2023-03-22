import { SubmissionType } from '../enums';
import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmission } from './submission';

type WebsiteFileDimension = {
  fileId: string;
  height: number;
  width: number;
};

export type FileSubmissionMetadata = IBaseSubmissionMetadata & {
  order: string[];

  /**
   * Stores information on file dimension modifications per site.
   */
  modifiedFileDimensions: Record<
    string | 'default' /* website id */,
    Record<string /* fileId */, WebsiteFileDimension>
  >;
};

export type FileSubmission = ISubmission<FileSubmissionMetadata>;

export function isFileSubmission(
  submission: ISubmission<IBaseSubmissionMetadata>
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
