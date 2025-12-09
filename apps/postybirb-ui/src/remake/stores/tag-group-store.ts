/**
 * Tag Group Store - Zustand store for tag group entities.
 */

import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import type { TagGroupDto } from '@postybirb/types';
import tagGroupsApi from '../api/tag-groups.api';
import AppSocket from '../transports/websocket';
import { type EntityStore } from './create-entity-store';
import { createTypedStore } from './create-typed-store';
import { TagGroupRecord } from './records';

/**
 * Tag group store with all standard selector hooks.
 */
export const {
  useStore: useTagGroupStore,
  useRecords: useTagGroups,
  useRecordsMap: useTagGroupsMap,
  useLoading: useTagGroupsLoading,
  useActions: useTagGroupActions,
} = createTypedStore<TagGroupDto, TagGroupRecord>({
  fetchFn: () => tagGroupsApi.getAll().then((r) => r.body),
  createRecord: (dto) => new TagGroupRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'TagGroupStore',
});

// Subscribe to websocket updates
AppSocket.on(TAG_GROUP_UPDATES, (payload: TagGroupDto[]) => {
  if (Array.isArray(payload)) {
    const records = payload.map((dto) => new TagGroupRecord(dto));
    useTagGroupStore.getState().setRecords(records);
  }
});

/**
 * Type alias for the tag group store.
 */
export type TagGroupStore = EntityStore<TagGroupRecord>;

// ============================================================================
// Additional Selector Hooks
// ============================================================================

/**
 * Select non-empty tag groups.
 */
export const useNonEmptyTagGroups = () =>
  useTagGroupStore((state) => state.records.filter((g) => !g.isEmpty));
