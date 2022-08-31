import { Submission } from '../../database/entities';
import { IBaseSubmissionMetadata } from './base-submission-metadata';

export type MessageSubmissionMetadata = IBaseSubmissionMetadata;

export type MessageSubmission = Submission<MessageSubmissionMetadata>;
