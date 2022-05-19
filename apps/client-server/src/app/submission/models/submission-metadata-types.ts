import { FileSubmissionMetadata } from './file-submission';
import { MessageSubmissionMetadata } from './message-submission';

export type SubmissionMetadataType =
  | FileSubmissionMetadata
  | MessageSubmissionMetadata;
