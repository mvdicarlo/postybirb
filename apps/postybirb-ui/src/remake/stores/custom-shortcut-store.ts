/**
 * Custom Shortcut Store - Zustand store for custom shortcut entities.
 */

import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import type { ICustomShortcutDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import customShortcutApi from '../api/custom-shortcut.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { CustomShortcutRecord } from './records';

/**
 * Fetch all custom shortcuts from the API.
 */
const fetchCustomShortcuts = async (): Promise<ICustomShortcutDto[]> => {
  const response = await customShortcutApi.getAll();
  return response.body;
};

/**
 * Custom shortcut store instance.
 */
export const useCustomShortcutStore = createEntityStore<ICustomShortcutDto, CustomShortcutRecord>(
  fetchCustomShortcuts,
  (dto) => new CustomShortcutRecord(dto),
  {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    storeName: 'CustomShortcutStore',
    websocketEvent: CUSTOM_SHORTCUT_UPDATES,
  }
);

/**
 * Type alias for the custom shortcut store.
 */
export type CustomShortcutStore = EntityStore<CustomShortcutRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all custom shortcuts.
 */
export const useCustomShortcuts = () => useCustomShortcutStore((state) => state.records);

/**
 * Select custom shortcuts map for O(1) lookup.
 */
export const useCustomShortcutsMap = () => useCustomShortcutStore((state) => state.recordsMap);

/**
 * Select custom shortcut loading state.
 */
export const useCustomShortcutsLoading = () =>
  useCustomShortcutStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select custom shortcut store actions.
 */
export const useCustomShortcutActions = () =>
  useCustomShortcutStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
