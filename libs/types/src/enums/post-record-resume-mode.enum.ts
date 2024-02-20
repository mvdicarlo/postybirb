/**
 * The resume mode of a requeued post record.
 * @enum {number}
 */
export enum PostRecordResumeMode {
  /**
   * Will continue only unattempted children.
   */
  CONTINUE = 'CONTINUE',

  /**
   * Will attempt to retry all failed children.
   */
  RETRY = 'RETRY',

  /**
   * Will restart the entire post record.
   */
  RESTART = 'RESTART',
}
