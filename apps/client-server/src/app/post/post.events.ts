import { POST_STATE_DELTA } from '@postybirb/socket-events';
import { JobTreeNode } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type PostEventTypes = PostStateDeltaEvent;

class PostStateDeltaEvent implements WebsocketEvent<JobTreeNode> {
  event: string = POST_STATE_DELTA;

  data: JobTreeNode = {} as JobTreeNode;
}
