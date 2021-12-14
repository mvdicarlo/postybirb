import { Submission } from '../entities/submission.entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata.model';

export interface MessageSubmissionMetadata extends IBaseSubmissionMetadata {}

export type MessageSubmission = Submission<MessageSubmissionMetadata>;
