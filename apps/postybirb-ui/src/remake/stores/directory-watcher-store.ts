/**
 * Directory Watcher Store - Zustand store for directory watcher entities.
 * Note: No websocket event exists for directory watchers.
 */

import type { DirectoryWatcherDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import directoryWatchersApi from '../api/directory-watchers.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { DirectoryWatcherRecord } from './records';

/**
 * Fetch all directory watchers from the API.
 */
const fetchDirectoryWatchers = async (): Promise<DirectoryWatcherDto[]> => {
  const response = await directoryWatchersApi.getAll();
  return response.body;
};

/**
 * Directory watcher store instance.
 */
export const useDirectoryWatcherStore = createEntityStore<DirectoryWatcherDto, DirectoryWatcherRecord>(
  fetchDirectoryWatchers,
  (dto) => new DirectoryWatcherRecord(dto),
  {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    storeName: 'DirectoryWatcherStore',
    // No websocket event for directory watchers
  }
);

/**
 * Type alias for the directory watcher store.
 */
export type DirectoryWatcherStore = EntityStore<DirectoryWatcherRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all directory watchers.
 */
export const useDirectoryWatchers = () => useDirectoryWatcherStore((state) => state.records);

/**
 * Select directory watchers map for O(1) lookup.
 */
export const useDirectoryWatchersMap = () => useDirectoryWatcherStore((state) => state.recordsMap);

/**
 * Select directory watcher loading state.
 */
export const useDirectoryWatchersLoading = () =>
  useDirectoryWatcherStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select watchers with valid paths configured.
 */
export const useActiveDirectoryWatchers = () =>
  useDirectoryWatcherStore((state) => state.records.filter((w) => w.hasPath));

/**
 * Select directory watcher store actions.
 */
export const useDirectoryWatcherActions = () =>
  useDirectoryWatcherStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
