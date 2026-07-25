import { NOTIFICATION_DELTA } from '@postybirb/socket-events';
import { INotification } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const NOTIFICATION_EVENTS: EntityDeltaDescriptor = {
  prefix: 'notification',
  delta: NOTIFICATION_DELTA,
};

export const NOTIFICATION_EVENT_PREFIX = NOTIFICATION_EVENTS.prefix;

export type NotificationEventTypes = EntityDeltaEvent<INotification>;
