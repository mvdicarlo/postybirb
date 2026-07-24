import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DIRECTORY_WATCHER_DELTA } from '@postybirb/socket-events';
import { DirectoryWatcherDto } from '@postybirb/types';
import { PostyBirbEventListener } from '../common/events/postybirb-event-listener';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { DIRECTORY_WATCHER_EVENT_PREFIX } from './directory-watcher.events';

@Injectable()
export class DirectoryWatcherEventListener extends PostyBirbEventListener<DirectoryWatcherDto> {
  constructor(
    @Optional() eventEmitter?: EventEmitter2,
    @Optional() webSocket?: WSGateway,
  ) {
    super(
      DIRECTORY_WATCHER_EVENT_PREFIX,
      DIRECTORY_WATCHER_DELTA,
      eventEmitter,
      webSocket,
    );
  }
}
