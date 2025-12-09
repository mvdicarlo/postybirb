/**
 * Directory Watcher Store - Zustand store for directory watcher entities.
 * Note: No websocket event exists for directory watchers.
 */

import type { DirectoryWatcherDto } from '@postybirb/types';
import directoryWatchersApi from '../api/directory-watchers.api';
import { type EntityStore } from './create-entity-store';
import { createTypedStore } from './create-typed-store';
import { DirectoryWatcherRecord } from './records';

/**
 * Directory watcher store with all standard selector hooks.
 */
export const {
  useStore: useDirectoryWatcherStore,
  useRecords: useDirectoryWatchers,
  useRecordsMap: useDirectoryWatchersMap,
  useLoading: useDirectoryWatchersLoading,
  useActions: useDirectoryWatcherActions,
} = createTypedStore<DirectoryWatcherDto, DirectoryWatcherRecord>({
  fetchFn: () => directoryWatchersApi.getAll().then((r) => r.body),
  createRecord: (dto) => new DirectoryWatcherRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'DirectoryWatcherStore',
  // No websocket event for directory watchers
});

/**
 * Type alias for the directory watcher store.
 */
export type DirectoryWatcherStore = EntityStore<DirectoryWatcherRecord>;

// ============================================================================
// Additional Selector Hooks
// ============================================================================

/**
 * Select watchers with valid paths configured.
 */
export const useActiveDirectoryWatchers = () =>
  useDirectoryWatcherStore((state) => state.records.filter((w) => w.hasPath));
