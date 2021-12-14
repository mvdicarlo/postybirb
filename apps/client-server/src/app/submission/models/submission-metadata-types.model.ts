import { FileSubmissionMetadata } from './file-submission.model';
import { MessageSubmissionMetadata } from './message-submission.model';

export type SubmissionMetadataType =
  | FileSubmissionMetadata
  | MessageSubmissionMetadata;
