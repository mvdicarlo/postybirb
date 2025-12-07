/**
 * Tag Group Store - Zustand store for tag group entities.
 */

import type { TagGroupDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import tagGroupsApi from '../api/tag-groups.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { TagGroupRecord } from './records';

/**
 * Fetch all tag groups from the API.
 */
const fetchTagGroups = async (): Promise<TagGroupDto[]> => {
  const response = await tagGroupsApi.getAll();
  return response.body;
};

/**
 * Tag group store instance.
 */
export const useTagGroupStore = createEntityStore<TagGroupDto, TagGroupRecord>(
  fetchTagGroups,
  (dto) => new TagGroupRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  'TagGroupStore'
);

/**
 * Type alias for the tag group store.
 */
export type TagGroupStore = EntityStore<TagGroupRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all tag groups.
 */
export const useTagGroups = () => useTagGroupStore((state) => state.records);

/**
 * Select tag groups map for O(1) lookup.
 */
export const useTagGroupsMap = () => useTagGroupStore((state) => state.recordsMap);

/**
 * Select tag group loading state.
 */
export const useTagGroupsLoading = () =>
  useTagGroupStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select non-empty tag groups.
 */
export const useNonEmptyTagGroups = () =>
  useTagGroupStore((state) => state.records.filter((g) => !g.isEmpty));

/**
 * Select tag group store actions.
 */
export const useTagGroupActions = () =>
  useTagGroupStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
