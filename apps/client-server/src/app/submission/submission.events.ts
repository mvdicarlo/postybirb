import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { ISubmissionDto, ISubmissionMetadata } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type SubmissionEventTypes = SubmissionUpdateEvent;

class SubmissionUpdateEvent
  implements WebsocketEvent<ISubmissionDto<ISubmissionMetadata>[]>
{
  event: string = SUBMISSION_UPDATES;

  data: ISubmissionDto<ISubmissionMetadata>[];
}
