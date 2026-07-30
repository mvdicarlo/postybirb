import { Injectable } from '@nestjs/common';
import { SubmissionId } from '@postybirb/types';

type LockSource = (submissionId: SubmissionId) => boolean;

/**
 * Answers "is this submission mid-post" for callers that must not import the
 * post engine.
 *
 * The engine owns the real answer but already imports SubmissionModule, so it
 * registers itself here rather than being injected the other way. Until it
 * does, nothing is locked — a module graph without the engine has nothing to
 * conflict with.
 *
 * Single-process by design: this reflects the scheduler in this process only.
 */
@Injectable()
export class PostingLockService {
  private source: LockSource = () => false;

  setSource(source: LockSource): void {
    this.source = source;
  }

  isPostingLocked(submissionId: SubmissionId): boolean {
    return this.source(submissionId);
  }
}
