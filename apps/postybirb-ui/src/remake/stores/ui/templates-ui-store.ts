/**
 * Templates UI state management using Zustand with localStorage persistence.
 * Manages template section filters and tab preferences.
 */

import { SubmissionType } from '@postybirb/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Types
// ============================================================================

/**
 * Templates UI state interface.
 */
interface TemplatesUIState {
  /** Currently selected template tab type */
  templatesTabType: SubmissionType;

  /** Templates search query */
  templatesSearchQuery: string;
}

/**
 * Templates UI actions interface.
 */
interface TemplatesUIActions {
  /** Set templates tab type */
  setTemplatesTabType: (type: SubmissionType) => void;

  /** Set templates search query */
  setTemplatesSearchQuery: (query: string) => void;

  /** Reset templates UI state */
  resetTemplatesUI: () => void;
}

/**
 * Complete Templates UI Store type.
 */
export type TemplatesUIStore = TemplatesUIState & TemplatesUIActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-templates-ui';

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default templates UI state.
 */
const initialState: TemplatesUIState = {
  templatesTabType: SubmissionType.FILE,
  templatesSearchQuery: '',
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for templates UI with localStorage persistence.
 */
export const useTemplatesUIStore = create<TemplatesUIStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setTemplatesTabType: (templatesTabType) => set({ templatesTabType }),
      setTemplatesSearchQuery: (templatesSearchQuery) =>
        set({ templatesSearchQuery }),

      // Reset to initial state
      resetTemplatesUI: () => set(initialState),
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

/** Select templates section filter state and actions */
export const useTemplatesFilter = () =>
  useTemplatesUIStore(
    useShallow((state) => ({
      tabType: state.templatesTabType,
      searchQuery: state.templatesSearchQuery,
      setTabType: state.setTemplatesTabType,
      setSearchQuery: state.setTemplatesSearchQuery,
    })),
  );
