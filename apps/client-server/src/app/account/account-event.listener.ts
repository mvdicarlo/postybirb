import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { ACCOUNT_DELTA } from '@postybirb/socket-events';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../web-socket/web-socket.events';
import {
  ACCOUNT_STATE_CHANGED,
  AccountStateChangedEvent,
  ACCOUNT_REMOVED,
  AccountRemovedEvent,
} from './account.events';

@Injectable()
export class AccountEventListener {
  private readonly logger = Logger(AccountEventListener.name);

  constructor(@Optional() private readonly webSocket?: WSGateway) {}

  @OnEvent(ACCOUNT_STATE_CHANGED)
  private accountStateChanged(events: AccountStateChangedEvent[]): void {
    this.emit({
      event: ACCOUNT_DELTA,
      data: {
        upserts: events.map((event) => event.account),
        removedIds: [],
      },
    } as WebSocketEvents);
  }

  @OnEvent(ACCOUNT_REMOVED)
  private accountRemoved(events: AccountRemovedEvent[]): void {
    this.emit({
      event: ACCOUNT_DELTA,
      data: {
        upserts: [],
        removedIds: events.map((event) => event.accountId),
      },
    } as WebSocketEvents);
  }

  private emit(event: WebSocketEvents): void {
    try {
      this.webSocket?.emit(event);
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Failed to emit websocket event '${event.event}'`);
    }
  }
}