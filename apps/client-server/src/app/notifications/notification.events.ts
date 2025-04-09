import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { INotification } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type NotificationEventTypes = NotificationEvent;

class NotificationEvent implements WebsocketEvent<INotification[]> {
  event: string = NOTIFICATION_UPDATES;

  data: INotification[];
}
