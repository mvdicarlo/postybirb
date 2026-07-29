import { USER_CONVERTER_DELTA } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const USER_CONVERTER_EVENTS: EntityDeltaDescriptor = {
  prefix: 'user-converter',
  delta: USER_CONVERTER_DELTA,
};

export const USER_CONVERTER_EVENT_PREFIX = USER_CONVERTER_EVENTS.prefix;

export type UserConverterEventTypes = EntityDeltaEvent<UserConverterDto>;
