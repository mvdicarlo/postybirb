/**
 * Accounts UI state management using Zustand with localStorage persistence.
 * Manages account section filters and visibility preferences.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { AccountLoginFilter } from '../types/account-filters';

// Re-export AccountLoginFilter enum from types
export { AccountLoginFilter } from '../types/account-filters';

// ============================================================================
// Types
// ============================================================================

/**
 * Accounts UI state interface.
 */
interface AccountsUIState {
  /** Hidden website IDs */
  hiddenWebsites: string[];

  /** Accounts search query */
  accountsSearchQuery: string;

  /** Account login filter */
  accountsLoginFilter: AccountLoginFilter;
}

/**
 * Accounts UI actions interface.
 */
interface AccountsUIActions {
  /** Set hidden websites */
  setHiddenWebsites: (websiteIds: string[]) => void;

  /** Toggle visibility of a specific website */
  toggleWebsiteVisibility: (websiteId: string) => void;

  /** Set accounts search query */
  setAccountsSearchQuery: (query: string) => void;

  /** Set account login filter */
  setAccountsLoginFilter: (filter: AccountLoginFilter) => void;

  /** Reset accounts UI state */
  resetAccountsUI: () => void;
}

/**
 * Complete Accounts UI Store type.
 */
export type AccountsUIStore = AccountsUIState & AccountsUIActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-accounts-ui';

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default accounts UI state.
 */
const initialState: AccountsUIState = {
  hiddenWebsites: [],
  accountsSearchQuery: '',
  accountsLoginFilter: AccountLoginFilter.All,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for accounts UI with localStorage persistence.
 */
export const useAccountsUIStore = create<AccountsUIStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setHiddenWebsites: (hiddenWebsites) => set({ hiddenWebsites }),
      toggleWebsiteVisibility: (websiteId) =>
        set((state) => ({
          hiddenWebsites: state.hiddenWebsites.includes(websiteId)
            ? state.hiddenWebsites.filter((id) => id !== websiteId)
            : [...state.hiddenWebsites, websiteId],
        })),
      setAccountsSearchQuery: (accountsSearchQuery) =>
        set({ accountsSearchQuery }),
      setAccountsLoginFilter: (accountsLoginFilter) =>
        set({ accountsLoginFilter }),

      // Reset to initial state
      resetAccountsUI: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ============================================================================
// Selector Hooks
// ============================================================================

/** Select hidden websites */
export const useHiddenWebsites = () =>
  useAccountsUIStore((state) => state.hiddenWebsites);

/** Select accounts section filter state and actions */
export const useAccountsFilter = () =>
  useAccountsUIStore(
    useShallow((state) => ({
      searchQuery: state.accountsSearchQuery,
      loginFilter: state.accountsLoginFilter,
      hiddenWebsites: state.hiddenWebsites,
      setSearchQuery: state.setAccountsSearchQuery,
      setLoginFilter: state.setAccountsLoginFilter,
      setHiddenWebsites: state.setHiddenWebsites,
      toggleWebsiteVisibility: state.toggleWebsiteVisibility,
    })),
  );
