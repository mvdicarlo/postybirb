/**
 * Typed Store Factory - Creates entity stores with all standard selector hooks.
 * Reduces boilerplate from ~70 lines to ~15 lines per store.
 */

import { useShallow } from 'zustand/shallow';
import { createEntityStore, type EntityStore } from './create-entity-store';
import type { BaseRecord } from './records/base-record';

/**
 * Configuration for creating a typed store.
 */
export interface TypedStoreConfig<TDto extends { id: string; updatedAt: string }, TRecord extends BaseRecord> {
  /** Async function that fetches DTOs from the API */
  fetchFn: () => Promise<TDto[]>;
  /** Function that converts a DTO to a Record class */
  createRecord: (dto: TDto) => TRecord;
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

/**
 * Return type of createTypedStore.
 */
export interface TypedStoreResult<TRecord extends BaseRecord> {
  /** The underlying Zustand store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useStore: ReturnType<typeof createEntityStore<any, TRecord>>;
  /** Hook to get all records */
  useRecords: () => TRecord[];
  /** Hook to get records map for O(1) lookup */
  useRecordsMap: () => Map<string, TRecord>;
  /** Hook to get loading state */
  useLoading: () => {
    loadingState: 'idle' | 'loading' | 'loaded' | 'error';
    error: string | null;
    isLoading: boolean;
    isLoaded: boolean;
  };
  /** Hook to get store actions */
  useActions: () => {
    loadAll: () => Promise<void>;
    setRecords: (records: TRecord[]) => void;
    getById: (id: string) => TRecord | undefined;
    clear: () => void;
  };
}

/**
 * Creates an entity store with all standard selector hooks.
 * Reduces boilerplate by generating the common selector patterns automatically.
 *
 * @example
 * ```typescript
 * export const {
 *   useStore: useTagConverterStore,
 *   useRecords: useTagConverters,
 *   useRecordsMap: useTagConvertersMap,
 *   useLoading: useTagConvertersLoading,
 *   useActions: useTagConverterActions,
 * } = createTypedStore({
 *   fetchFn: () => tagConvertersApi.getAll().then((r) => r.body),
 *   createRecord: (dto) => new TagConverterRecord(dto),
 *   storeName: 'TagConverterStore',
 *   websocketEvent: TAG_CONVERTER_UPDATES,
 * });
 * ```
 */
export function createTypedStore<TDto extends { id: string; updatedAt: string }, TRecord extends BaseRecord>(
  config: TypedStoreConfig<TDto, TRecord>
): TypedStoreResult<TRecord> {
  type StoreState = EntityStore<TRecord>;

  const useStore = createEntityStore<TDto, TRecord>(
    config.fetchFn,
    config.createRecord,
    {
      storeName: config.storeName,
      websocketEvent: config.websocketEvent,
      hasChanged: config.hasChanged,
    }
  );

  /**
   * Hook to get all records.
   * Uses shallow comparison to prevent unnecessary re-renders.
   */
  const useRecords = () =>
    useStore(useShallow((state: StoreState) => state.records));

  /**
   * Hook to get records map for O(1) lookup.
   * Reference stability is handled upstream by diffRecords.
   */
  const useRecordsMap = () =>
    useStore((state: StoreState) => state.recordsMap);

  /**
   * Hook to get loading state.
   */
  const useLoading = () =>
    useStore(
      useShallow((state: StoreState) => ({
        loadingState: state.loadingState,
        error: state.error,
        isLoading: state.loadingState === 'loading',
        isLoaded: state.loadingState === 'loaded',
      }))
    );

  /**
   * Hook to get store actions.
   * useShallow is required because the selector returns an object literal —
   * without it, Zustand's Object.is check sees a new reference every render → infinite loop.
   */
  const useActions = () =>
    useStore(
      useShallow((state: StoreState) => ({
        loadAll: state.loadAll,
        setRecords: state.setRecords,
        getById: state.getById,
        clear: state.clear,
      }))
    );

  return {
    useStore,
    useRecords,
    useRecordsMap,
    useLoading,
    useActions,
  };
}

/**
 * Type alias for extracting the store type from a typed store result.
 */
export type ExtractStoreType<T> = T extends TypedStoreResult<infer R>
  ? EntityStore<R>
  : never;
