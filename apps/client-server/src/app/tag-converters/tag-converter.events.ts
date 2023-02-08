import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { TagConverter } from '../database/entities/tag-converter.entity';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type TagConverterEventTypes = TagConverterUpdateEvent;

class TagConverterUpdateEvent implements WebsocketEvent<TagConverter[]> {
  event: string = TAG_CONVERTER_UPDATES;

  data: TagConverter[];
}
