/**
 * Custom Shortcut Store - Zustand store for custom shortcut entities.
 */

import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import type { ICustomShortcutDto } from '@postybirb/types';
import customShortcutApi from '../../api/custom-shortcut.api';
import { type EntityStore } from '../create-entity-store';
import { createTypedStore } from '../create-typed-store';
import { CustomShortcutRecord } from '../records';

/**
 * Custom shortcut store with all standard selector hooks.
 */
export const {
  useStore: useCustomShortcutStore,
  useRecords: useCustomShortcuts,
  useRecordsMap: useCustomShortcutsMap,
  useLoading: useCustomShortcutsLoading,
  useActions: useCustomShortcutActions,
} = createTypedStore<ICustomShortcutDto, CustomShortcutRecord>({
  fetchFn: () => customShortcutApi.getAll().then((r) => r.body),
  createRecord: (dto) => new CustomShortcutRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'CustomShortcutStore',
  websocketEvent: CUSTOM_SHORTCUT_UPDATES,
});

/**
 * Export the store for direct access outside of React components.
 * Used by BlockNote inline content specs that render outside React context.
 */
export const customShortcutStoreRef = useCustomShortcutStore;

/**
 * Type alias for the custom shortcut store.
 */
export type CustomShortcutStore = EntityStore<CustomShortcutRecord>;
