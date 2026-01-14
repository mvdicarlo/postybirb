import { DIRECTORY_WATCHER_UPDATES } from '@postybirb/socket-events';
import { DirectoryWatcherDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type DirectoryWatcherEventTypes = DirectoryWatcherUpdateEvent;

class DirectoryWatcherUpdateEvent
  implements WebsocketEvent<DirectoryWatcherDto[]>
{
  event: string = DIRECTORY_WATCHER_UPDATES;

  data: DirectoryWatcherDto[];
}
