import { Submission } from '../entities/submission.entity';
import { IBaseSubmissionMetadata } from './base-submission-metadata';

export type MessageSubmissionMetadata = IBaseSubmissionMetadata;

export type MessageSubmission = Submission<MessageSubmissionMetadata>;
