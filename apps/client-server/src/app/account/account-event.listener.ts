import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACCOUNT_DELTA } from '@postybirb/socket-events';
import { IAccountDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { ACCOUNT_EVENT_PREFIX } from './account.events';

@Injectable()
export class AccountEventListener extends PostyBirbEventListener<IAccountDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(ACCOUNT_EVENT_PREFIX, ACCOUNT_DELTA, eventEmitter, webSocket);
  }
}