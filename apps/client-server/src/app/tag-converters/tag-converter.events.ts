/* eslint-disable max-classes-per-file */
import { TAG_CONVERTER_DELTA } from '@postybirb/socket-events';
import { EntityDelta, TagConverterDto } from '@postybirb/types';
import {
  EntityCreatedEvent,
  EntityRemovedEvent,
  EntityUpdatedEvent,
} from '../common/events/entity-crud.events';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export const TAG_CONVERTER_CREATED = 'tag-converter.created';
export const TAG_CONVERTER_UPDATED = 'tag-converter.updated';
export const TAG_CONVERTER_REMOVED = 'tag-converter.removed';

export class TagConverterCreatedEvent extends EntityCreatedEvent<TagConverterDto> {}

export class TagConverterUpdatedEvent extends EntityUpdatedEvent<TagConverterDto> {}

export class TagConverterRemovedEvent extends EntityRemovedEvent {}

export type TagConverterEventTypes = TagConverterDeltaEvent;

class TagConverterDeltaEvent
  implements WebsocketEvent<EntityDelta<TagConverterDto>>
{
  event: string = TAG_CONVERTER_DELTA;

  data: EntityDelta<TagConverterDto>;
}
