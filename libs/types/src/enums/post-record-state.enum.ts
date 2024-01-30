/**
 * The state of the post record.
 * @enum {number}
 */
export enum PostRecordState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}
