import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CUSTOM_SHORTCUT_DELTA } from '@postybirb/socket-events';
import { ICustomShortcutDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CUSTOM_SHORTCUT_EVENT_PREFIX } from './custom-shortcut.events';

@Injectable()
export class CustomShortcutEventListener extends PostyBirbEventListener<ICustomShortcutDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(
      CUSTOM_SHORTCUT_EVENT_PREFIX,
      CUSTOM_SHORTCUT_DELTA,
      eventEmitter,
      webSocket,
    );
  }
}
