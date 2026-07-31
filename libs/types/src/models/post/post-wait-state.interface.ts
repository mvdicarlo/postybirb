import { AccountId } from '../account/account.interface';
import { SubmissionId } from '../submission/submission.interface';

/**
 * Ephemeral wait state for a website that is rate-limited.
 * Not persisted — only transmitted via WebSocket and API for UI display.
 * @interface IPostWaitState
 */
export interface IPostWaitState {
  /**
   * The submission currently being posted.
   * @type {SubmissionId}
   */
  submissionId: SubmissionId;

  /**
   * The account being waited for.
   * @type {AccountId}
   */
  accountId: AccountId;

  /**
   * ISO timestamp of when the wait ends and posting will resume.
   * @type {string}
   */
  waitUntil: string;

  /**
   * The website display name.
   * @type {string}
   */
  websiteName: string;
}
