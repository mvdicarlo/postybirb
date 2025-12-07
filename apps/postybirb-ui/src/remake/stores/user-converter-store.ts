/**
 * User Converter Store - Zustand store for user converter entities.
 */

import type { UserConverterDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import userConvertersApi from '../api/user-converters.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { UserConverterRecord } from './records';

/**
 * Fetch all user converters from the API.
 */
const fetchUserConverters = async (): Promise<UserConverterDto[]> => {
  const response = await userConvertersApi.getAll();
  return response.body;
};

/**
 * User converter store instance.
 */
export const useUserConverterStore = createEntityStore<UserConverterDto, UserConverterRecord>(
  fetchUserConverters,
  (dto) => new UserConverterRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  'UserConverterStore'
);

/**
 * Type alias for the user converter store.
 */
export type UserConverterStore = EntityStore<UserConverterRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all user converters.
 */
export const useUserConverters = () => useUserConverterStore((state) => state.records);

/**
 * Select user converters map for O(1) lookup.
 */
export const useUserConvertersMap = () => useUserConverterStore((state) => state.recordsMap);

/**
 * Select user converter loading state.
 */
export const useUserConvertersLoading = () =>
  useUserConverterStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select user converter store actions.
 */
export const useUserConverterActions = () =>
  useUserConverterStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
