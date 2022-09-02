import { IBaseSubmissionMetadata } from './base-submission-metadata';
import { ISubmission } from './submission';

export type MessageSubmissionMetadata = IBaseSubmissionMetadata;

export type MessageSubmission = ISubmission<MessageSubmissionMetadata>;
