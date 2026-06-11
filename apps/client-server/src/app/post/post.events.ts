/* eslint-disable max-classes-per-file */
import { POST_STATE_DELTA, POST_WAIT_STATE } from '@postybirb/socket-events';
import { IPostWaitState, JobTreeNode } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type PostEventTypes = PostWaitStateEvent | PostStateDeltaEvent;

class PostWaitStateEvent implements WebsocketEvent<IPostWaitState[]> {
  event: string = POST_WAIT_STATE;

  data: IPostWaitState[] = [];
}

class PostStateDeltaEvent implements WebsocketEvent<JobTreeNode> {
  event: string = POST_STATE_DELTA;

  data: JobTreeNode = {} as JobTreeNode;
}
