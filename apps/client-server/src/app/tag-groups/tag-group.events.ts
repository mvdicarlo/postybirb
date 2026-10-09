import { TAG_GROUP_DELTA } from '@postybirb/socket-events';
import { TagGroupDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const TAG_GROUP_EVENTS: EntityDeltaDescriptor = {
  prefix: 'tag-group',
  delta: TAG_GROUP_DELTA,
};

export const TAG_GROUP_EVENT_PREFIX = TAG_GROUP_EVENTS.prefix;

export type TagGroupEventTypes = EntityDeltaEvent<TagGroupDto>;
