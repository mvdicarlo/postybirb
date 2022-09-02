import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { IBaseSubmissionMetadata } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';
import { SubmissionDto } from './dtos/submission.dto';

export type SubmissionEventTypes = SubmissionUpdateEvent;

class SubmissionUpdateEvent
  implements WebsocketEvent<SubmissionDto<IBaseSubmissionMetadata>[]>
{
  event: string = SUBMISSION_UPDATES;

  data: SubmissionDto<IBaseSubmissionMetadata>[];
}
