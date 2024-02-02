import { ISubmissionMetadata } from '../submission-metadata.interface';
import { ISubmission } from '../submission.interface';

/**
 * Metadata associated with a message submission.
 * @typedef {ISubmissionMetadata} MessageSubmissionMetadata
 */
export type MessageSubmissionMetadata = ISubmissionMetadata;

/**
 * Represents a message submission with associated metadata.
 * @typedef {ISubmission<MessageSubmissionMetadata>} MessageSubmission
 */
export type MessageSubmission = ISubmission<MessageSubmissionMetadata>;
