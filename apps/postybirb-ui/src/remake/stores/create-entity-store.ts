/**
 * Base entity store factory for creating Zustand stores with common CRUD patterns.
 * All entity stores follow a similar pattern of loading, storing, and providing access to records.
 */

import type { EntityId } from '@postybirb/types';
import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { useShallow } from 'zustand/shallow';
import AppSocket from '../transports/websocket';
import type { BaseRecord } from './records/base-record';

/**
 * Loading state for async operations.
 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Base state interface for all entity stores.
 */
export interface BaseEntityState<T extends BaseRecord> {
  /** Array of all records */
  records: T[];
  /** Map of records by ID for O(1) lookup */
  recordsMap: Map<EntityId, T>;
  /** Current loading state */
  loadingState: LoadingState;
  /** Error message if loading failed */
  error: string | null;
  /** Timestamp of last successful load */
  lastLoadedAt: Date | null;
}

/**
 * Base actions interface for all entity stores.
 */
export interface BaseEntityActions<T extends BaseRecord> {
  /** Load all records from the API */
  loadAll: () => Promise<void>;
  /** Set records directly (for websocket updates) */
  setRecords: (records: T[]) => void;
  /** Get a record by ID */
  getById: (id: EntityId) => T | undefined;
  /** Clear all records and reset state */
  clear: () => void;
}

/**
 * Complete entity store type.
 */
export type EntityStore<T extends BaseRecord> = BaseEntityState<T> & BaseEntityActions<T>;

/**
 * Options for creating an entity store.
 */
export interface CreateEntityStoreOptions {
  /** Name of the store for debugging */
  storeName: string;
  /** Websocket event name to subscribe to for real-time updates (optional) */
  websocketEvent?: string;
}

/**
 * Factory function to create an entity store.
 *
 * @param fetchFn - Async function that fetches DTOs from the API
 * @param createRecord - Function that converts a DTO to a Record class
 * @param options - Store configuration options
 */
export function createEntityStore<TDto, TRecord extends BaseRecord>(
  fetchFn: () => Promise<TDto[]>,
  createRecord: (dto: TDto) => TRecord,
  options: CreateEntityStoreOptions
) {
  const { storeName, websocketEvent } = options;

  const initialState: BaseEntityState<TRecord> = {
    records: [],
    recordsMap: new Map(),
    loadingState: 'idle',
    error: null,
    lastLoadedAt: null,
  };

  type StoreType = EntityStore<TRecord>;
  type SetState = StoreApi<StoreType>['setState'];
  type GetState = StoreApi<StoreType>['getState'];

  const storeCreator = (set: SetState, get: GetState): StoreType => ({
    ...initialState,

    loadAll: async () => {
      // Skip if already loading
      if (get().loadingState === 'loading') {
        return;
      }

      set({ loadingState: 'loading', error: null });

      try {
        const dtos = await fetchFn();
        const records = dtos.map(createRecord);
        const recordsMap = new Map<EntityId, TRecord>();
        records.forEach((record) => {
          recordsMap.set(record.id, record);
        });

        set({
          records,
          recordsMap,
          loadingState: 'loaded',
          lastLoadedAt: new Date(),
        });

        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.debug(`[${storeName}] Loaded ${records.length} records`);
      } catch (err) {
        // eslint-disable-next-line lingui/no-unlocalized-strings
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        set({
          loadingState: 'error',
          error: errorMessage,
        });
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error(`[${storeName}] Failed to load:`, err);
      }
    },

    setRecords: (records: TRecord[]) => {
      const recordsMap = new Map<EntityId, TRecord>();
      records.forEach((record) => {
        recordsMap.set(record.id, record);
      });

      set({
        records,
        recordsMap,
        loadingState: 'loaded',
        lastLoadedAt: new Date(),
      });
    },

    getById: (id: EntityId) => get().recordsMap.get(id),

    clear: () => {
      set(initialState);
    },
  });

  const store = create<StoreType>(storeCreator);

  // Subscribe to websocket events if event name is provided
  if (websocketEvent) {
    AppSocket.on(websocketEvent, (dtos: TDto[]) => {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.debug(`[${storeName}] Received ${dtos.length} records via websocket`);

      const records = dtos.map(createRecord);
      const recordsMap = new Map<EntityId, TRecord>();
      records.forEach((record) => {
        recordsMap.set(record.id, record);
      });

      store.setState({
        records,
        recordsMap,
        loadingState: 'loaded',
        lastLoadedAt: new Date(),
      });
    });
  }

  return store;
}

/**
 * Hook factory to create a selector for records array.
 */
export function useRecordsSelector<T extends BaseRecord>(
  store: ReturnType<typeof createEntityStore<unknown, T>>
): T[] {
  type StoreState = EntityStore<T>;
  return store((state: StoreState) => state.records);
}

/**
 * Hook factory to create a selector for loading state.
 */
export function useLoadingStateSelector<T extends BaseRecord>(
  store: ReturnType<typeof createEntityStore<unknown, T>>
) {
  type StoreState = EntityStore<T>;
  return store(
    useShallow((state: StoreState) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
      hasError: state.loadingState === 'error',
    }))
  );
}
