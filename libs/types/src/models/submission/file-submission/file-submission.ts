import { SubmissionType } from '../../../enums';
import { ISubmissionMetadata } from '../submission-metadata.interface';
import { ISubmission } from '../submission.interface';
import { FileSubmissionMetadata } from './file-submission-metadata.type';

/**
 * Represents a file submission.
 * @type {FileSubmission}
 */
export type FileSubmission = ISubmission<FileSubmissionMetadata>;

/**
 * Checks if the given submission is a file submission.
 * @param {ISubmission<ISubmissionMetadata>} submission - The submission to check.
 * @returns {boolean} - True if the submission is a file submission, false otherwise.
 */
export function isFileSubmission(
  submission: ISubmission<ISubmissionMetadata>,
): submission is FileSubmission {
  return submission && submission.type === SubmissionType.FILE;
}
