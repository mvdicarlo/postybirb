/* eslint-disable max-classes-per-file */
import { USER_CONVERTER_DELTA } from '@postybirb/socket-events';
import { EntityDelta, UserConverterDto } from '@postybirb/types';
import {
    EntityCreatedEvent,
    EntityRemovedEvent,
    EntityUpdatedEvent,
} from '../common/events/entity-crud.events';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export const USER_CONVERTER_CREATED = 'user-converter.created';
export const USER_CONVERTER_UPDATED = 'user-converter.updated';
export const USER_CONVERTER_REMOVED = 'user-converter.removed';

export class UserConverterCreatedEvent extends EntityCreatedEvent<UserConverterDto> {}

export class UserConverterUpdatedEvent extends EntityUpdatedEvent<UserConverterDto> {}

export class UserConverterRemovedEvent extends EntityRemovedEvent {}

export type UserConverterEventTypes = UserConverterDeltaEvent;

class UserConverterDeltaEvent
  implements WebsocketEvent<EntityDelta<UserConverterDto>>
{
  event: string = USER_CONVERTER_DELTA;

  data: EntityDelta<UserConverterDto>;
}
