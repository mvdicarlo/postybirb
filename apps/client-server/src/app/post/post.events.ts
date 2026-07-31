import { POST_WAIT_STATE } from '@postybirb/socket-events';
import { IPostWaitState } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type PostEventTypes = PostWaitStateEvent;

class PostWaitStateEvent implements WebsocketEvent<IPostWaitState[]> {
  event: string = POST_WAIT_STATE;

  data: IPostWaitState[] = [];
}
