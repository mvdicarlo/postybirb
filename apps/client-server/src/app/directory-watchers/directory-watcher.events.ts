import { DIRECTORY_WATCHER_DELTA } from '@postybirb/socket-events';
import { DirectoryWatcherDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const DIRECTORY_WATCHER_EVENTS: EntityDeltaDescriptor = {
  prefix: 'directory-watcher',
  delta: DIRECTORY_WATCHER_DELTA,
};

export const DIRECTORY_WATCHER_EVENT_PREFIX = DIRECTORY_WATCHER_EVENTS.prefix;

export type DirectoryWatcherEventTypes = EntityDeltaEvent<DirectoryWatcherDto>;
