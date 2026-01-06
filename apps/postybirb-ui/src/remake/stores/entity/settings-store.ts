/**
 * Settings Store - Zustand store for application settings.
 *
 * Note: Although the API returns an array, there will only ever be one settings record.
 * The store provides a convenient `useSettings()` hook that returns the single record.
 */

import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import type { SettingsDto } from '@postybirb/types';
import settingsApi from '../../api/settings.api';
import { createEntityStore, type EntityStore } from '../create-entity-store';
import { SettingsRecord } from '../records/settings-record';

/**
 * Fetch all settings from the API.
 */
const fetchSettings = async (): Promise<SettingsDto[]> => {
  const response = await settingsApi.getAll();
  return response.body;
};

/**
 * Settings store instance.
 */
export const useSettingsStore = createEntityStore<SettingsDto, SettingsRecord>(
  fetchSettings,
  (dto) => new SettingsRecord(dto),
  {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    storeName: 'SettingsStore',
    websocketEvent: SETTINGS_UPDATES,
  },
);

/**
 * Type alias for the settings store.
 */
export type SettingsStore = EntityStore<SettingsRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select the single settings record.
 * Returns undefined if settings haven't been loaded yet.
 */
export const useSettings = (): SettingsRecord | undefined =>
  useSettingsStore((state) => state.records[0]);

/**
 * Select the settings options directly.
 * Useful when you only need the settings values without the record wrapper.
 */
export const useSettingsOptions = () =>
  useSettingsStore((state) => state.records[0]?.settings);

/**
 * Select specific settings values.
 */
export const useLanguage = () =>
  useSettingsStore((state) => state.records[0]?.language);

export const useQueuePaused = () =>
  useSettingsStore((state) => state.records[0]?.queuePaused ?? false);

export const useHiddenWebsites = () =>
  useSettingsStore((state) => state.records[0]?.hiddenWebsites ?? []);

export const useAllowAd = () =>
  useSettingsStore((state) => state.records[0]?.allowAd ?? true);

export const useDesktopNotifications = () =>
  useSettingsStore((state) => state.records[0]?.desktopNotifications);

export const useTagSearchProvider = () =>
  useSettingsStore((state) => state.records[0]?.tagSearchProvider);

/**
 * Select settings loading state.
 */
export const useSettingsLoading = () =>
  useSettingsStore((state) => ({
    loadingState: state.loadingState,
    error: state.error,
    isLoading: state.loadingState === 'loading',
    isLoaded: state.loadingState === 'loaded',
  }));

/**
 * Select settings actions.
 */
export const useSettingsActions = () =>
  useSettingsStore((state) => ({
    loadAll: state.loadAll,
    clear: state.clear,
  }));
