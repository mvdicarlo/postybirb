import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SETTINGS_DELTA } from '@postybirb/socket-events';
import { SettingsDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { SETTINGS_EVENT_PREFIX } from './settings.events';

@Injectable()
export class SettingsEventListener extends PostyBirbEventListener<SettingsDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(SETTINGS_EVENT_PREFIX, SETTINGS_DELTA, eventEmitter, webSocket);
  }
}
