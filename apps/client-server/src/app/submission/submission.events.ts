import { SUBMISSION_DELTA } from '@postybirb/socket-events';
import { ISubmissionDelta, ISubmissionMetadata } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type SubmissionEventTypes = SubmissionDeltaEvent;

class SubmissionDeltaEvent
  implements WebsocketEvent<ISubmissionDelta<ISubmissionMetadata>>
{
  event: string = SUBMISSION_DELTA;

  data: ISubmissionDelta<ISubmissionMetadata>;
}
