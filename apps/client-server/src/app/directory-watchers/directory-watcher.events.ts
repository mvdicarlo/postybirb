import { DirectoryWatcherDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const DIRECTORY_WATCHER_EVENT_PREFIX = 'directory-watcher';

export type DirectoryWatcherEventTypes = EntityDeltaEvent<DirectoryWatcherDto>;
