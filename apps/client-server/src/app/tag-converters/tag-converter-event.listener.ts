import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TAG_CONVERTER_DELTA } from '@postybirb/socket-events';
import { TagConverterDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { TAG_CONVERTER_EVENT_PREFIX } from './tag-converter.events';

@Injectable()
export class TagConverterEventListener extends PostyBirbEventListener<TagConverterDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(
      TAG_CONVERTER_EVENT_PREFIX,
      TAG_CONVERTER_DELTA,
      eventEmitter,
      webSocket,
    );
  }
}
