import { INotification } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const NOTIFICATION_EVENT_PREFIX = 'notification';

export type NotificationEventTypes = EntityDeltaEvent<INotification>;
