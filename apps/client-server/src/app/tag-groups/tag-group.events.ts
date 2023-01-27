import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { TagGroup } from '../database/entities/tag-group.entity';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type TagGroupEventTypes = TagGroupUpdateEvent;

class TagGroupUpdateEvent implements WebsocketEvent<TagGroup[]> {
  event: string = TAG_GROUP_UPDATES;

  data: TagGroup[];
}
