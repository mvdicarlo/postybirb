import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { TagGroupDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type TagGroupEventTypes = TagGroupUpdateEvent;

class TagGroupUpdateEvent implements WebsocketEvent<TagGroupDto[]> {
  event: string = TAG_GROUP_UPDATES;

  data: TagGroupDto[];
}
