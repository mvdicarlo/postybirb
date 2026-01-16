import { EntityId, PostRecordResumeMode } from '@postybirb/types';

/**
 * Error thrown when attempting to create a PostRecord in an invalid state.
 *
 * This indicates a bug in the calling code - the caller should have verified
 * the submission state before requesting a PostRecord creation.
 *
 * Error reasons:
 * - no_origin: CONTINUE/RETRY requested but no prior NEW PostRecord exists
 * - origin_done: CONTINUE/RETRY requested but the origin NEW record is DONE (chain closed)
 * - in_progress: A PostRecord for this submission is already PENDING or RUNNING
 */
export class InvalidPostChainError extends Error {
  public readonly submissionId: EntityId;

  public readonly requestedResumeMode: PostRecordResumeMode;

  public readonly reason: 'no_origin' | 'origin_done' | 'in_progress';

  constructor(
    submissionId: EntityId,
    requestedResumeMode: PostRecordResumeMode,
    reason: 'no_origin' | 'origin_done' | 'in_progress',
  ) {
    let message: string;
    switch (reason) {
      case 'no_origin':
        message = `Cannot create ${requestedResumeMode} PostRecord for submission ${submissionId}: no prior NEW PostRecord found to chain from`;
        break;
      case 'origin_done':
        message = `Cannot create ${requestedResumeMode} PostRecord for submission ${submissionId}: the origin NEW PostRecord is already DONE (chain is closed)`;
        break;
      case 'in_progress':
        message = `Cannot create ${requestedResumeMode} PostRecord for submission ${submissionId}: a PostRecord is already PENDING or RUNNING`;
        break;
    }

    super(message);
    this.name = 'InvalidPostChainError';
    this.submissionId = submissionId;
    this.requestedResumeMode = requestedResumeMode;
    this.reason = reason;
  }
}
