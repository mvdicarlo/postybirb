/**
 * Website Store - Zustand store for website info entities.
 * Handles website metadata, login types, and capabilities.
 */

import { WEBSITE_UPDATES } from '@postybirb/socket-events';
import type { IWebsiteInfoDto, WebsiteId } from '@postybirb/types';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import websitesApi from '../api/websites.api';
import AppSocket from '../transports/websocket';
import type { LoadingState } from './create-entity-store';
import { WebsiteRecord } from './records';

/**
 * Website store state interface.
 */
interface WebsiteState {
  /** Array of all website records */
  websites: WebsiteRecord[];
  /** Map of websites by ID for O(1) lookup */
  websitesMap: Map<WebsiteId, WebsiteRecord>;
  /** Current loading state */
  loadingState: LoadingState;
  /** Error message if loading failed */
  error: string | null;
  /** Timestamp of last successful load */
  lastLoadedAt: Date | null;
}

/**
 * Website store actions interface.
 */
interface WebsiteActions {
  /** Load all websites from the API */
  loadAll: () => Promise<void>;
  /** Set websites directly (for websocket updates) */
  setWebsites: (dtos: IWebsiteInfoDto[]) => void;
  /** Get a website by ID */
  getById: (id: WebsiteId) => WebsiteRecord | undefined;
  /** Clear all websites and reset state */
  clear: () => void;
}

/**
 * Complete website store type.
 */
export type WebsiteStore = WebsiteState & WebsiteActions;

/**
 * Initial state for the website store.
 */
const initialState: WebsiteState = {
  websites: [],
  websitesMap: new Map(),
  loadingState: 'idle',
  error: null,
  lastLoadedAt: null,
};

/**
 * Fetch all websites from the API.
 */
const fetchWebsites = async (): Promise<IWebsiteInfoDto[]> => {
  const response = await websitesApi.getWebsiteInfo();
  return response.body;
};

/**
 * Website store instance.
 */
export const useWebsiteStore = create<WebsiteStore>((set, get) => {
  // Subscribe to websocket updates
  AppSocket.on(WEBSITE_UPDATES, (data: IWebsiteInfoDto[]) => {
    const records = data.map((dto) => new WebsiteRecord(dto));
    const websitesMap = new Map<WebsiteId, WebsiteRecord>();
    records.forEach((record) => {
      websitesMap.set(record.id, record);
    });

    set({
      websites: records,
      websitesMap,
      lastLoadedAt: new Date(),
    });
  });

  return {
    ...initialState,

    loadAll: async () => {
      // Skip if already loading
      if (get().loadingState === 'loading') {
        return;
      }

      set({ loadingState: 'loading', error: null });

      try {
        const dtos = await fetchWebsites();
        const records = dtos.map((dto) => new WebsiteRecord(dto));
        const websitesMap = new Map<WebsiteId, WebsiteRecord>();
        records.forEach((record) => {
          websitesMap.set(record.id, record);
        });

        set({
          websites: records,
          websitesMap,
          loadingState: 'loaded',
          error: null,
          lastLoadedAt: new Date(),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : // eslint-disable-next-line lingui/no-unlocalized-strings
              'Failed to load websites';
        set({
          loadingState: 'error',
          error: errorMessage,
        });
        throw err;
      }
    },

    setWebsites: (dtos: IWebsiteInfoDto[]) => {
      const records = dtos.map((dto) => new WebsiteRecord(dto));
      const websitesMap = new Map<WebsiteId, WebsiteRecord>();
      records.forEach((record) => {
        websitesMap.set(record.id, record);
      });

      set({
        websites: records,
        websitesMap,
        lastLoadedAt: new Date(),
      });
    },

    getById: (id: WebsiteId) => get().websitesMap.get(id),

    clear: () => {
      set(initialState);
    },
  };
});

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all websites.
 */
export const useWebsites = (): WebsiteRecord[] =>
  useWebsiteStore((state: WebsiteStore) => state.websites);

/**
 * Select websites map for O(1) lookup.
 */
export const useWebsitesMap = (): Map<WebsiteId, WebsiteRecord> =>
  useWebsiteStore((state: WebsiteStore) => state.websitesMap);

/**
 * Select website loading state.
 */
export const useWebsitesLoading = () =>
  useWebsiteStore(
    useShallow((state: WebsiteStore) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select a specific website by ID.
 */
export const useWebsite = (id: WebsiteId): WebsiteRecord | undefined =>
  useWebsiteStore((state: WebsiteStore) => state.websitesMap.get(id));

/**
 * Select websites that support file submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useFileWebsites = (): WebsiteRecord[] =>
  useWebsiteStore(
    useShallow((state: WebsiteStore) =>
      state.websites.filter((website) => website.supportsFile)
    )
  );

/**
 * Select websites that support message submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useMessageWebsites = (): WebsiteRecord[] =>
  useWebsiteStore(
    useShallow((state: WebsiteStore) =>
      state.websites.filter((website) => website.supportsMessage)
    )
  );

/**
 * Select website store actions.
 */
export const useWebsiteActions = () =>
  useWebsiteStore(
    useShallow((state: WebsiteStore) => ({
      loadAll: state.loadAll,
      setWebsites: state.setWebsites,
      getById: state.getById,
      clear: state.clear,
    }))
  );
