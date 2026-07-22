import { TagGroupDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const TAG_GROUP_EVENT_PREFIX = 'tag-group';

export type TagGroupEventTypes = EntityDeltaEvent<TagGroupDto>;
