/**
 * Base entity store factory for creating Zustand stores with common CRUD patterns.
 * All entity stores follow a similar pattern of loading, storing, and providing access to records.
 */

import type { EntityId } from '@postybirb/types';
import type { StoreApi } from 'zustand';
import { create } from 'zustand';
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
export interface CreateEntityStoreOptions<TDto = unknown, TRecord extends BaseRecord = BaseRecord> {
  /** Name of the store for debugging */
  storeName: string;
  /** Websocket event name to subscribe to for real-time updates (optional) */
  websocketEvent?: string;
  /**
   * Custom comparator to determine whether a record has changed.
   * Receives the existing record and the incoming DTO.
   * Return `true` if the record has changed and should be re-created.
   * When not provided, falls back to comparing `updatedAt` timestamps.
   */
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean;
}

// ============================================================================
// Record-level diffing
// ============================================================================

/**
 * Diff incoming DTOs against existing records.
 * Only calls `createRecord` for genuinely new or changed entities.
 * Preserves existing record references when unchanged to prevent downstream re-renders.
 *
 * @returns `null` if nothing changed (callers should skip setState), or the new records + map.
 */
export function diffRecords<TDto extends { id: string; updatedAt: string }, TRecord extends BaseRecord>(
  existingMap: Map<EntityId, TRecord>,
  dtos: TDto[],
  createRecord: (dto: TDto) => TRecord,
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean,
): { records: TRecord[]; recordsMap: Map<EntityId, TRecord> } | null {
  let anyChanged = false;

  // Detect additions / removals by comparing size + IDs
  if (dtos.length !== existingMap.size) {
    anyChanged = true;
  }

  const records: TRecord[] = [];
  const recordsMap = new Map<EntityId, TRecord>();

  for (const dto of dtos) {
    const existing = existingMap.get(dto.id);

    if (existing) {
      // Determine if the record actually changed
      const changed = hasChanged
        ? hasChanged(existing, dto)
        : dto.updatedAt !== existing.updatedAt.toISOString();

      if (changed) {
        const newRecord = createRecord(dto);
        records.push(newRecord);
        recordsMap.set(newRecord.id, newRecord);
        anyChanged = true;
      } else {
        // Reuse existing reference — this is the key optimisation
        records.push(existing);
        recordsMap.set(existing.id, existing);
      }
    } else {
      // New record
      const newRecord = createRecord(dto);
      records.push(newRecord);
      recordsMap.set(newRecord.id, newRecord);
      anyChanged = true;
    }
  }

  return anyChanged ? { records, recordsMap } : null;
}

/**
 * Factory function to create an entity store.
 *
 * @param fetchFn - Async function that fetches DTOs from the API
 * @param createRecord - Function that converts a DTO to a Record class
 * @param options - Store configuration options
 */
export function createEntityStore<TDto extends { id: string; updatedAt: string }, TRecord extends BaseRecord>(
  fetchFn: () => Promise<TDto[]>,
  createRecord: (dto: TDto) => TRecord,
  options: CreateEntityStoreOptions<TDto, TRecord>
) {
  const { storeName, websocketEvent, hasChanged } = options;

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
        const { recordsMap: existingMap } = get();

        // Use diffing on subsequent loads; on first load existingMap is empty so all records are new
        const diffResult = diffRecords(existingMap, dtos, createRecord, hasChanged);
        if (diffResult) {
          set({
            records: diffResult.records,
            recordsMap: diffResult.recordsMap,
            loadingState: 'loaded',
            lastLoadedAt: new Date(),
          });
        } else {
          // No changes — just update loading state
          set({ loadingState: 'loaded', lastLoadedAt: new Date() });
        }

        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.debug(`[${storeName}] Loaded ${dtos.length} records`);
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

      const { recordsMap: existingMap } = store.getState();
      const diffResult = diffRecords(existingMap, dtos, createRecord, hasChanged);

      if (diffResult) {
        store.setState({
          records: diffResult.records,
          recordsMap: diffResult.recordsMap,
          loadingState: 'loaded',
          lastLoadedAt: new Date(),
        });
      }
      // If diffResult is null, nothing changed — skip setState entirely
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
