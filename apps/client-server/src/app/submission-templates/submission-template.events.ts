import { SUBMISSION_TEMPLATE_UPDATES } from '@postybirb/socket-events';
import { ISubmissionTemplateDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type SubmissionTemplateEventTypes = SubmissionTemplateUpdateEvent;

class SubmissionTemplateUpdateEvent
  implements WebsocketEvent<ISubmissionTemplateDto[]>
{
  event: string = SUBMISSION_TEMPLATE_UPDATES;

  data: ISubmissionTemplateDto[];
}
