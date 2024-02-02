import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { TagConverterDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type TagConverterEventTypes = TagConverterUpdateEvent;

class TagConverterUpdateEvent implements WebsocketEvent<TagConverterDto[]> {
  event: string = TAG_CONVERTER_UPDATES;

  data: TagConverterDto[];
}
