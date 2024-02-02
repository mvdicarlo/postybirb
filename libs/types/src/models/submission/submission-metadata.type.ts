import { MessageSubmissionMetadata } from './message-submission/message-submission.type';
import { FileSubmissionMetadata } from './file-submission/file-submission-metadata.type';

/**
 * Defines the type of submission metadata.
 *
 * @typedef {FileSubmissionMetadata | MessageSubmissionMetadata} SubmissionMetadataType
 */
export type SubmissionMetadataType =
  | FileSubmissionMetadata // Submission metadata for a file
  | MessageSubmissionMetadata; // Submission metadata for a message
