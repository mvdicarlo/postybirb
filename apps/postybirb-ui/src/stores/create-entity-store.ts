/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable lingui/no-unlocalized-strings */
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
  /** Insert or replace individual records without replacing the collection */
  upsertRecords: (records: T[]) => void;
  /** Remove individual records by ID */
  removeRecords: (ids: EntityId[]) => void;
  /** Get a record by ID */
  getById: (id: EntityId) => T | undefined;
  /** Clear all records and reset state */
  clear: () => void;
}

/**
 * Complete entity store type.
 */
export type EntityStore<T extends BaseRecord> = BaseEntityState<T> &
  BaseEntityActions<T>;

/**
 * Options for creating an entity store.
 */
export interface CreateEntityStoreOptions<
  TDto = unknown,
  TRecord extends BaseRecord = BaseRecord,
> {
  /** Name of the store for debugging */
  storeName: string;
  /** Websocket event name to subscribe to for real-time updates (optional) */
  websocketEvent?: string;
  /** Websocket event carrying incremental upserts and removals (optional) */
  websocketDeltaEvent?: string;
  /** Reload the authoritative snapshot after websocket reconnection */
  reloadOnReconnect?: boolean;
  /**
   * Custom comparator to determine whether a record has changed.
   * Receives the existing record and the incoming DTO.
   * Return `true` if the record has changed and should be re-created.
   * When not provided, falls back to comparing `updatedAt` timestamps.
   */
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean;
}

export interface EntityDelta<TDto> {
  upserts: TDto[];
  removals: EntityId[];
}

// ============================================================================
// Record-level diffing
// ============================================================================

/**
 * Compute a shallow diff between two plain objects, returning changed keys
 * with their old and new values. Nested objects are compared by JSON serialization.
 */
function shallowDiff(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    // Fast reference check, then fall back to JSON comparison for objects
    if (oldVal !== newVal) {
      const same =
        typeof oldVal === 'object' &&
        typeof newVal === 'object' &&
        oldVal !== null &&
        newVal !== null
          ? JSON.stringify(oldVal) === JSON.stringify(newVal)
          : false;
      if (!same) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Diff incoming DTOs against existing records.
 * Only calls `createRecord` for genuinely new or changed entities.
 * Preserves existing record references when unchanged to prevent downstream re-renders.
 *
 * @returns `null` if nothing changed (callers should skip setState), or the new records + map.
 */
export function diffRecords<
  TDto extends { id: string; updatedAt: string },
  TRecord extends BaseRecord,
>(
  existingMap: Map<EntityId, TRecord>,
  dtos: TDto[],
  createRecord: (dto: TDto) => TRecord,
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean,
  storeName?: string,
): { records: TRecord[]; recordsMap: Map<EntityId, TRecord> } | null {
  let anyChanged = false;
  const tag = storeName ? `[${storeName}]` : '[diffRecords]';

  const added: string[] = [];
  const removed: string[] = [];
  const updated: {
    id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }[] = [];

  // Detect additions / removals by comparing size + IDs
  if (dtos.length !== existingMap.size) {
    anyChanged = true;
  }

  // Detect removed records (exist in map but not in incoming DTOs)
  const incomingIds = new Set(dtos.map((d) => d.id));
  for (const id of existingMap.keys()) {
    if (!incomingIds.has(id)) {
      removed.push(id);
    }
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

        // Compute field-level diff for logging
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldDiff = shallowDiff(existing as any, newRecord as any);
        updated.push({ id: dto.id, changes: fieldDiff ?? {} });
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
      added.push(dto.id);
    }
  }

  // Log diff summary
  if (anyChanged) {
    // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
    console.groupCollapsed(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      `${tag} Record diff — ${added.length} added, ${removed.length} removed, ${updated.length} updated`,
    );
    if (added.length > 0) {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.log('Added:', added);
    }
    if (removed.length > 0) {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.log('Removed:', removed);
    }
    for (const u of updated) {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.groupCollapsed(`Updated: ${u.id}`);
      for (const [key, val] of Object.entries(u.changes)) {
        // eslint-disable-next-line no-console
        console.log(
          `  %c${key}`,
          'font-weight:bold',
          '\n    old:',
          val.old,
          '\n    new:',
          val.new,
        );
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  return anyChanged ? { records, recordsMap } : null;
}

function upsertDtos<
  TDto extends { id: string; updatedAt: string },
  TRecord extends BaseRecord,
>(
  existingRecords: TRecord[],
  existingMap: Map<EntityId, TRecord>,
  dtos: TDto[],
  createRecord: (dto: TDto) => TRecord,
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean,
): { records: TRecord[]; recordsMap: Map<EntityId, TRecord> } | null {
  if (dtos.length === 0) return null;

  const recordsMap = new Map(existingMap);
  const replacementIds = new Set<EntityId>();
  const addedIds: EntityId[] = [];
  const addedIdSet = new Set<EntityId>();

  for (const dto of dtos) {
    const existing = recordsMap.get(dto.id);
    const changed = existing
      ? hasChanged
        ? hasChanged(existing, dto)
        : dto.updatedAt !== existing.updatedAt.toISOString()
      : true;
    if (!changed) continue;

    const record = createRecord(dto);
    recordsMap.set(record.id, record);
    replacementIds.add(record.id);
    if (!existingMap.has(record.id) && !addedIdSet.has(record.id)) {
      addedIdSet.add(record.id);
      addedIds.push(record.id);
    }
  }

  if (replacementIds.size === 0) return null;

  const records = existingRecords.map(
    (record) => recordsMap.get(record.id) ?? record,
  );
  for (const id of addedIds) {
    const record = recordsMap.get(id);
    if (record) records.push(record);
  }

  return { records, recordsMap };
}

function removeRecordIds<TRecord extends BaseRecord>(
  existingRecords: TRecord[],
  existingMap: Map<EntityId, TRecord>,
  ids: EntityId[],
): { records: TRecord[]; recordsMap: Map<EntityId, TRecord> } | null {
  const removedIds = new Set(ids.filter((id) => existingMap.has(id)));
  if (removedIds.size === 0) return null;

  const recordsMap = new Map(existingMap);
  removedIds.forEach((id) => recordsMap.delete(id));
  return {
    records: existingRecords.filter((record) => !removedIds.has(record.id)),
    recordsMap,
  };
}

function applyDelta<
  TDto extends { id: string; updatedAt: string },
  TRecord extends BaseRecord,
>(
  existingRecords: TRecord[],
  existingMap: Map<EntityId, TRecord>,
  delta: EntityDelta<TDto>,
  createRecord: (dto: TDto) => TRecord,
  hasChanged?: (existing: TRecord, newDto: TDto) => boolean,
): { records: TRecord[]; recordsMap: Map<EntityId, TRecord> } | null {
  const upserted = upsertDtos(
    existingRecords,
    existingMap,
    delta.upserts,
    createRecord,
    hasChanged,
  );
  const records = upserted?.records ?? existingRecords;
  const recordsMap = upserted?.recordsMap ?? existingMap;
  const removed = removeRecordIds(records, recordsMap, delta.removals);

  return removed ?? upserted;
}

/**
 * Factory function to create an entity store.
 *
 * @param fetchFn - Async function that fetches DTOs from the API
 * @param createRecord - Function that converts a DTO to a Record class
 * @param options - Store configuration options
 */
export function createEntityStore<
  TDto extends { id: string; updatedAt: string },
  TRecord extends BaseRecord,
>(
  fetchFn: () => Promise<TDto[]>,
  createRecord: (dto: TDto) => TRecord,
  options: CreateEntityStoreOptions<TDto, TRecord>,
) {
  const {
    storeName,
    websocketEvent,
    websocketDeltaEvent,
    reloadOnReconnect,
    hasChanged,
  } = options;
  let bufferedDeltas: EntityDelta<TDto>[] = [];

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
        const {
          records: existingRecords,
          recordsMap: existingMap,
        } = get();

        // Use diffing on subsequent loads; on first load existingMap is empty so all records are new
        const diffResult = diffRecords(
          existingMap,
          dtos,
          createRecord,
          hasChanged,
          storeName,
        );
        let records = diffResult?.records ?? existingRecords;
        let recordsMap = diffResult?.recordsMap ?? existingMap;
        const deltas = bufferedDeltas;
        bufferedDeltas = [];
        for (const delta of deltas) {
          const deltaResult = applyDelta(
            records,
            recordsMap,
            delta,
            createRecord,
            hasChanged,
          );
          if (deltaResult) {
            records = deltaResult.records;
            recordsMap = deltaResult.recordsMap;
          }
        }

        set({
          records,
          recordsMap,
          loadingState: 'loaded',
          lastLoadedAt: new Date(),
        });

        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.debug(`[${storeName}] Loaded ${dtos.length} records`);
      } catch (err) {
        const errorMessage =
          // eslint-disable-next-line lingui/no-unlocalized-strings
          err instanceof Error ? err.message : 'Unknown error';
        let { records, recordsMap } = get();
        const deltas = bufferedDeltas;
        bufferedDeltas = [];
        for (const delta of deltas) {
          const deltaResult = applyDelta(
            records,
            recordsMap,
            delta,
            createRecord,
            hasChanged,
          );
          if (deltaResult) {
            records = deltaResult.records;
            recordsMap = deltaResult.recordsMap;
          }
        }

        set({
          records,
          recordsMap,
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

    upsertRecords: (incomingRecords: TRecord[]) => {
      const { records, recordsMap } = get();
      const nextMap = new Map(recordsMap);
      const replacements = new Set<EntityId>();
      const additions: TRecord[] = [];

      for (const record of incomingRecords) {
        if (nextMap.get(record.id) === record) continue;
        if (!nextMap.has(record.id)) additions.push(record);
        replacements.add(record.id);
        nextMap.set(record.id, record);
      }
      if (replacements.size === 0) return;

      set({
        records: [
          ...records.map((record) => nextMap.get(record.id) ?? record),
          ...additions,
        ],
        recordsMap: nextMap,
        lastLoadedAt: new Date(),
      });
    },

    removeRecords: (ids: EntityId[]) => {
      const { records, recordsMap } = get();
      const result = removeRecordIds(records, recordsMap, ids);
      if (result) {
        set({ ...result, lastLoadedAt: new Date() });
      }
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
      // eslint-disable-next-line no-console
      console.debug(
        `[${storeName}] Received ${dtos.length} records via websocket`,
      );

      const { recordsMap: existingMap } = store.getState();
      const diffResult = diffRecords(
        existingMap,
        dtos,
        createRecord,
        hasChanged,
        storeName,
      );

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

  if (websocketDeltaEvent) {
    AppSocket.on(websocketDeltaEvent, (delta: EntityDelta<TDto>) => {
      if (store.getState().loadingState === 'loading') {
        bufferedDeltas.push(delta);
        return;
      }

      const { records, recordsMap } = store.getState();
      const result = applyDelta(
        records,
        recordsMap,
        delta,
        createRecord,
        hasChanged,
      );
      if (result) {
        store.setState({
          ...result,
          loadingState: 'loaded',
          lastLoadedAt: new Date(),
        });
      }
    });
  }

  if (reloadOnReconnect) {
    let hasConnected = AppSocket.connected;
    AppSocket.on('connect', () => {
      if (hasConnected) {
        store
          .getState()
          .loadAll()
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(`[${storeName}] Reconnect reload failed:`, error);
          });
      }
      hasConnected = true;
    });
  }

  return store;
}

/**
 * Hook factory to create a selector for records array.
 */
export function useRecordsSelector<T extends BaseRecord>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: ReturnType<typeof createEntityStore<any, T>>,
): T[] {
  type StoreState = EntityStore<T>;
  return store((state: StoreState) => state.records);
}

/**
 * Hook factory to create a selector for loading state.
 */
export function useLoadingStateSelector<T extends BaseRecord>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: ReturnType<typeof createEntityStore<any, T>>,
) {
  type StoreState = EntityStore<T>;
  return store(
    useShallow((state: StoreState) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
      hasError: state.loadingState === 'error',
    })),
  );
}
