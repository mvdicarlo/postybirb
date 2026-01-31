import { UPDATE_UPDATES } from '@postybirb/socket-events';
import { UpdateState } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type UpdateEventTypes = UpdateUpdateEvent;

class UpdateUpdateEvent implements WebsocketEvent<UpdateState> {
  event: string = UPDATE_UPDATES;

  data: UpdateState;
}
