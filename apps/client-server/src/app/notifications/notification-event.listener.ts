import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_DELTA } from '@postybirb/socket-events';
import { INotification } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { NOTIFICATION_EVENT_PREFIX } from './notification.events';

@Injectable()
export class NotificationEventListener extends PostyBirbEventListener<INotification> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(
      NOTIFICATION_EVENT_PREFIX,
      NOTIFICATION_DELTA,
      eventEmitter,
      webSocket,
    );
  }
}
