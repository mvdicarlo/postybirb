/**
 * User Converter Store - Zustand store for user converter entities.
 * Uses createTypedStore for reduced boilerplate.
 */

import { USER_CONVERTER_UPDATES } from '@postybirb/socket-events';
import type { UserConverterDto } from '@postybirb/types';
import userConvertersApi from '../api/user-converters.api';
import AppSocket from '../transports/websocket';
import { type EntityStore } from './create-entity-store';
import { createTypedStore } from './create-typed-store';
import { UserConverterRecord } from './records';

/**
 * User converter store with all standard hooks.
 */
export const {
  useStore: useUserConverterStore,
  useRecords: useUserConverters,
  useRecordsMap: useUserConvertersMap,
  useLoading: useUserConvertersLoading,
  useActions: useUserConverterActions,
} = createTypedStore<UserConverterDto, UserConverterRecord>({
  fetchFn: async () => {
    const response = await userConvertersApi.getAll();
    return response.body;
  },
  createRecord: (dto) => new UserConverterRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'UserConverterStore',
});

// Subscribe to websocket updates
AppSocket.on(USER_CONVERTER_UPDATES, (payload: UserConverterDto[]) => {
  if (Array.isArray(payload)) {
    const records = payload.map((dto) => new UserConverterRecord(dto));
    useUserConverterStore.getState().setRecords(records);
  }
});

/**
 * Type alias for the user converter store.
 */
export type UserConverterStore = EntityStore<UserConverterRecord>;
