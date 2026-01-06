/**
 * Store initialization utility.
 * Provides a hook to load all entity stores when the app starts.
 */

import { useEffect, useState } from 'react';
import { useAccountStore } from './entity/account-store';
import { useCustomShortcutStore } from './entity/custom-shortcut-store';
import { useDirectoryWatcherStore } from './entity/directory-watcher-store';
import { useNotificationStore } from './entity/notification-store';
import { useSettingsStore } from './entity/settings-store';
import { useSubmissionStore } from './entity/submission-store';
import { useTagConverterStore } from './entity/tag-converter-store';
import { useTagGroupStore } from './entity/tag-group-store';
import { useUserConverterStore } from './entity/user-converter-store';
import { useWebsiteStore } from './entity/website-store';

/**
 * Load all entity stores in parallel.
 * Returns a promise that resolves when all stores are loaded.
 */
export async function loadAllStores(): Promise<void> {
  await Promise.all([
    useAccountStore.getState().loadAll(),
    useSettingsStore.getState().loadAll(),
    useSubmissionStore.getState().loadAll(),
    useCustomShortcutStore.getState().loadAll(),
    useDirectoryWatcherStore.getState().loadAll(),
    useNotificationStore.getState().loadAll(),
    useTagConverterStore.getState().loadAll(),
    useTagGroupStore.getState().loadAll(),
    useUserConverterStore.getState().loadAll(),
    useWebsiteStore.getState().loadAll(),
  ]);
}

/**
 * Hook to initialize all stores on mount.
 * Returns loading state for initial data fetch.
 */
export function useInitializeStores() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized) return;

    setIsLoading(true);
    loadAllStores()
      .then(() => {
        setIsInitialized(true);
        setIsLoading(false);
      })
      .catch((err) => {
        // eslint-disable-next-line lingui/no-unlocalized-strings
        setError(err instanceof Error ? err.message : 'Failed to load stores');
        setIsLoading(false);
      });
  }, [isInitialized]);

  return { isInitialized, isLoading, error };
}

/**
 * Check if all stores are loaded.
 */
export function areAllStoresLoaded(): boolean {
  return (
    useAccountStore.getState().loadingState === 'loaded' &&
    useSettingsStore.getState().loadingState === 'loaded' &&
    useSubmissionStore.getState().loadingState === 'loaded' &&
    useCustomShortcutStore.getState().loadingState === 'loaded' &&
    useDirectoryWatcherStore.getState().loadingState === 'loaded' &&
    useNotificationStore.getState().loadingState === 'loaded' &&
    useTagConverterStore.getState().loadingState === 'loaded' &&
    useTagGroupStore.getState().loadingState === 'loaded' &&
    useUserConverterStore.getState().loadingState === 'loaded' &&
    useWebsiteStore.getState().loadingState === 'loaded'
  );
}

/**
 * Clear all stores and reset to initial state.
 */
export function clearAllStores(): void {
  useAccountStore.getState().clear();
  useSettingsStore.getState().clear();
  useSubmissionStore.getState().clear();
  useCustomShortcutStore.getState().clear();
  useDirectoryWatcherStore.getState().clear();
  useNotificationStore.getState().clear();
  useTagConverterStore.getState().clear();
  useTagGroupStore.getState().clear();
  useUserConverterStore.getState().clear();
  useWebsiteStore.getState().clear();
}
