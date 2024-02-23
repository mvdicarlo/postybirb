/**
 * The resume mode of a requeued post record.
 * @enum {number}
 */
export enum PostRecordResumeMode {
  /**
   * Will continue only unattempted/failed children.
   * Continues from last successful batched file.
   */
  CONTINUE = 'CONTINUE',

  /**
   * Same as CONTINUE, but also restarts all files in a post record.
   */
  CONTINUE_RETRY = 'RETRY',

  /**
   * Will restart the entire post record.
   */
  RESTART = 'RESTART',
}
