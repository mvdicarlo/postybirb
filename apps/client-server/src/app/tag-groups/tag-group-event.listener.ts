import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TAG_GROUP_DELTA } from '@postybirb/socket-events';
import { TagGroupDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { TAG_GROUP_EVENT_PREFIX } from './tag-group.events';

@Injectable()
export class TagGroupEventListener extends PostyBirbEventListener<TagGroupDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(TAG_GROUP_EVENT_PREFIX, TAG_GROUP_DELTA, eventEmitter, webSocket);
  }
}
