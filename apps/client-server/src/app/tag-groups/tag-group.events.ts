/* eslint-disable max-classes-per-file */
import { TAG_GROUP_DELTA } from '@postybirb/socket-events';
import { EntityDelta, TagGroupDto } from '@postybirb/types';
import {
  EntityCreatedEvent,
  EntityRemovedEvent,
  EntityUpdatedEvent,
} from '../common/events/entity-crud.events';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export const TAG_GROUP_CREATED = 'tag-group.created';
export const TAG_GROUP_UPDATED = 'tag-group.updated';
export const TAG_GROUP_REMOVED = 'tag-group.removed';

export class TagGroupCreatedEvent extends EntityCreatedEvent<TagGroupDto> {}

export class TagGroupUpdatedEvent extends EntityUpdatedEvent<TagGroupDto> {}

export class TagGroupRemovedEvent extends EntityRemovedEvent {}

export type TagGroupEventTypes = TagGroupDeltaEvent;

class TagGroupDeltaEvent implements WebsocketEvent<EntityDelta<TagGroupDto>> {
  event: string = TAG_GROUP_DELTA;

  data: EntityDelta<TagGroupDto>;
}
