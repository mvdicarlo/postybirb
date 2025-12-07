/**
 * Tag Converter Store - Zustand store for tag converter entities.
 */

import type { TagConverterDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import tagConvertersApi from '../api/tag-converters.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { TagConverterRecord } from './records';

/**
 * Fetch all tag converters from the API.
 */
const fetchTagConverters = async (): Promise<TagConverterDto[]> => {
  const response = await tagConvertersApi.getAll();
  return response.body;
};

/**
 * Tag converter store instance.
 */
export const useTagConverterStore = createEntityStore<TagConverterDto, TagConverterRecord>(
  fetchTagConverters,
  (dto) => new TagConverterRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  'TagConverterStore'
);

/**
 * Type alias for the tag converter store.
 */
export type TagConverterStore = EntityStore<TagConverterRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all tag converters.
 */
export const useTagConverters = () => useTagConverterStore((state) => state.records);

/**
 * Select tag converters map for O(1) lookup.
 */
export const useTagConvertersMap = () => useTagConverterStore((state) => state.recordsMap);

/**
 * Select tag converter loading state.
 */
export const useTagConvertersLoading = () =>
  useTagConverterStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select tag converter store actions.
 */
export const useTagConverterActions = () =>
  useTagConverterStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
