import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { USER_CONVERTER_DELTA } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { USER_CONVERTER_EVENT_PREFIX } from './user-converter.events';

@Injectable()
export class UserConverterEventListener extends PostyBirbEventListener<UserConverterDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(
      USER_CONVERTER_EVENT_PREFIX,
      USER_CONVERTER_DELTA,
      eventEmitter,
      webSocket,
    );
  }
}
