import { SubmissionId } from '../../models';

/**
 * DTO model for performing a queue/dequeue operation on a post record
 * @interface IQueuePostRecordRequestDto
 */
export interface IQueuePostRecordRequestDto {
  ids: SubmissionId[];
}
