/**
 * Event types for the post event ledger.
 * Each posting action is recorded as an immutable event.
 * @enum {string}
 */
export enum PostEventType {
  /**
   * Emitted when posting to a website begins.
   * Metadata includes postData and accountSnapshot.
   */
  POST_ATTEMPT_STARTED = 'POST_ATTEMPT_STARTED',

  /**
   * Emitted when posting to a website completes successfully.
   */
  POST_ATTEMPT_COMPLETED = 'POST_ATTEMPT_COMPLETED',

  /**
   * Emitted when posting to a website fails terminally.
   */
  POST_ATTEMPT_FAILED = 'POST_ATTEMPT_FAILED',

  /**
   * Emitted when a single file is successfully posted.
   * Includes sourceUrl and fileSnapshot in metadata.
   */
  FILE_POSTED = 'FILE_POSTED',

  /**
   * Emitted when a single file fails to post.
   * Includes error details and fileSnapshot in metadata.
   */
  FILE_FAILED = 'FILE_FAILED',

  /**
   * Emitted when a message submission is successfully posted.
   * Includes sourceUrl.
   */
  MESSAGE_POSTED = 'MESSAGE_POSTED',

  /**
   * Emitted when a message submission fails to post.
   * Includes error details.
   */
  MESSAGE_FAILED = 'MESSAGE_FAILED',
}
