import { TAG_CONVERTER_DELTA } from '@postybirb/socket-events';
import { TagConverterDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const TAG_CONVERTER_EVENTS: EntityDeltaDescriptor = {
  prefix: 'tag-converter',
  delta: TAG_CONVERTER_DELTA,
};

export const TAG_CONVERTER_EVENT_PREFIX = TAG_CONVERTER_EVENTS.prefix;

export type TagConverterEventTypes = EntityDeltaEvent<TagConverterDto>;
