/**
 * Tag Converter Store - Zustand store for tag converter entities.
 * Uses createTypedStore for reduced boilerplate.
 */

import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import type { TagConverterDto } from '@postybirb/types';
import tagConvertersApi from '../api/tag-converters.api';
import { type EntityStore } from './create-entity-store';
import { createTypedStore } from './create-typed-store';
import { TagConverterRecord } from './records';

/**
 * Tag converter store with all standard hooks.
 */
export const {
  useStore: useTagConverterStore,
  useRecords: useTagConverters,
  useRecordsMap: useTagConvertersMap,
  useLoading: useTagConvertersLoading,
  useActions: useTagConverterActions,
} = createTypedStore<TagConverterDto, TagConverterRecord>({
  fetchFn: async () => {
    const response = await tagConvertersApi.getAll();
    return response.body;
  },
  createRecord: (dto) => new TagConverterRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'TagConverterStore',
  websocketEvent: TAG_CONVERTER_UPDATES,
});

/**
 * Type alias for the tag converter store.
 */
export type TagConverterStore = EntityStore<TagConverterRecord>;
