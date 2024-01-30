/**
 * The resume mode of a requeued post record.
 * @enum {number}
 */
export enum PostRecordResumeMode {
  /**
   * Will continue only unattempted children.
   */
  CONTINUE = 'continue',

  /**
   * Will attempt to retry all failed children.
   */
  RETRY = 'retry',

  /**
   * Will restart the entire post record.
   */
  RESTART = 'restart',
}
