/**
 * Navigation state management using Zustand with localStorage persistence.
 * Manages view state, navigation history, and view caching.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  createAccountsViewState,
  createFileSubmissionsViewState,
  createHomeViewState,
  createMessageSubmissionsViewState,
  createTemplatesViewState,
  defaultViewState,
  type SectionId,
  type ViewState,
} from '../../types/view-state';
import { useAccountStore } from '../entity/account-store';
import { useSubmissionStore } from '../entity/submission-store';

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation state interface.
 */
interface NavigationState {
  /** Current view state - controls which section/view is active and its parameters */
  viewState: ViewState;

  /** View state cache - preserves per-view state when switching between views */
  viewStateCache: Partial<Record<SectionId, ViewState>>;

  /** Navigation history - tracks view navigation for back/forward (max 30) */
  navigationHistory: SectionId[];

  /** Current index in navigation history */
  historyIndex: number;
}

/**
 * Navigation actions interface.
 */
interface NavigationActions {
  /** Set the current view state */
  setViewState: (viewState: ViewState) => void;

  /** Navigate back in history */
  goBack: () => void;

  /** Navigate forward in history */
  goForward: () => void;

  /** Reset navigation state */
  resetNavigation: () => void;
}

/**
 * Complete Navigation Store type.
 */
export type NavigationStore = NavigationState & NavigationActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-navigation';

/**
 * Maximum number of entries in navigation history.
 */
const MAX_HISTORY_LENGTH = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and clean a view state by checking if referenced entity IDs exist.
 * Silently removes invalid selections.
 */
function validateViewState(viewState: ViewState): ViewState {
  const submissionsMap = useSubmissionStore.getState().recordsMap;
  const accountsMap = useAccountStore.getState().recordsMap;

  switch (viewState.type) {
    case 'file-submissions': {
      const validIds = viewState.params.selectedIds.filter((id) =>
        submissionsMap.has(id),
      );
      if (validIds.length !== viewState.params.selectedIds.length) {
        return {
          type: 'file-submissions',
          params: {
            ...viewState.params,
            selectedIds: validIds,
          },
        };
      }
      return viewState;
    }

    case 'message-submissions': {
      const validIds = viewState.params.selectedIds.filter((id) =>
        submissionsMap.has(id),
      );
      if (validIds.length !== viewState.params.selectedIds.length) {
        return {
          type: 'message-submissions',
          params: {
            ...viewState.params,
            selectedIds: validIds,
          },
        };
      }
      return viewState;
    }

    case 'accounts': {
      const { selectedId } = viewState.params;
      if (selectedId && !accountsMap.has(selectedId)) {
        return {
          type: 'accounts',
          params: {
            ...viewState.params,
            selectedId: null,
          },
        };
      }
      return viewState;
    }

    case 'templates': {
      const { selectedId } = viewState.params;
      if (selectedId && !submissionsMap.has(selectedId)) {
        return {
          type: 'templates',
          params: {
            ...viewState.params,
            selectedId: null,
          },
        };
      }
      return viewState;
    }

    case 'home':
    default:
      return viewState;
  }
}

/**
 * Get default view state for a given section ID.
 */
function getDefaultViewState(sectionId: SectionId): ViewState {
  switch (sectionId) {
    case 'home':
      return createHomeViewState();
    case 'accounts':
      return createAccountsViewState();
    case 'file-submissions':
      return createFileSubmissionsViewState();
    case 'message-submissions':
      return createMessageSubmissionsViewState();
    case 'templates':
      return createTemplatesViewState();
    default:
      return defaultViewState;
  }
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default navigation state.
 */
const initialState: NavigationState = {
  viewState: defaultViewState,
  viewStateCache: {},
  navigationHistory: ['home'],
  historyIndex: 0,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for navigation with localStorage persistence.
 */
export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // View state actions
      setViewState: (viewState) =>
        set((state) => {
          const isNavigatingToNewSection =
            state.viewState.type !== viewState.type;

          // Save current view state to cache
          const newCache = {
            ...state.viewStateCache,
            [state.viewState.type]: state.viewState,
          };

          let finalViewState: ViewState;

          // Check if the provided viewState has explicit selections
          const hasExplicitSelection =
            (viewState.type === 'file-submissions' ||
              viewState.type === 'message-submissions') &&
            viewState.params.selectedIds.length > 0;

          if (isNavigatingToNewSection && !hasExplicitSelection) {
            // Navigating to a different section without explicit selection: restore from cache
            const cachedState = newCache[viewState.type];
            if (cachedState && cachedState.type === viewState.type) {
              // Restore from cache and validate
              finalViewState = validateViewState(cachedState);
            } else {
              // First visit to this section
              finalViewState = viewState;
            }
          } else {
            // Staying in the same section OR explicit selection provided: use the provided state
            finalViewState = viewState;
          }

          // Update navigation history
          let newHistory = [...state.navigationHistory];
          let newIndex = state.historyIndex;

          // Only add to history if navigating to a different section
          if (isNavigatingToNewSection) {
            // Truncate forward history when navigating from middle
            newHistory = newHistory.slice(0, newIndex + 1);

            // Add new entry (deduplicate consecutive duplicates)
            const lastEntry = newHistory[newHistory.length - 1];
            if (lastEntry !== finalViewState.type) {
              newHistory.push(finalViewState.type);
              newIndex = newHistory.length - 1;

              // Cap history at max length
              if (newHistory.length > MAX_HISTORY_LENGTH) {
                newHistory = newHistory.slice(
                  newHistory.length - MAX_HISTORY_LENGTH,
                );
                newIndex = newHistory.length - 1;
              }
            }
          }

          return {
            viewState: finalViewState,
            viewStateCache: newCache,
            navigationHistory: newHistory,
            historyIndex: newIndex,
          };
        }),

      // Navigation history actions
      goBack: () =>
        set((state) => {
          if (state.historyIndex <= 0) return state;

          const newIndex = state.historyIndex - 1;
          const targetSection = state.navigationHistory[newIndex];

          // Get cached state or default for target section
          const cachedState = state.viewStateCache[targetSection];
          const targetViewState = cachedState
            ? validateViewState(cachedState)
            : getDefaultViewState(targetSection);

          return {
            viewState: targetViewState,
            historyIndex: newIndex,
          };
        }),

      goForward: () =>
        set((state) => {
          if (state.historyIndex >= state.navigationHistory.length - 1)
            return state;

          const newIndex = state.historyIndex + 1;
          const targetSection = state.navigationHistory[newIndex];

          // Get cached state or default for target section
          const cachedState = state.viewStateCache[targetSection];
          const targetViewState = cachedState
            ? validateViewState(cachedState)
            : getDefaultViewState(targetSection);

          return {
            viewState: targetViewState,
            historyIndex: newIndex,
          };
        }),

      // Reset to initial state
      resetNavigation: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persist only view state and cache, not history
      partialize: (state) => ({
        viewState: state.viewState,
        viewStateCache: state.viewStateCache,
      }),
    },
  ),
);

// ============================================================================
// Selector Hooks
// ============================================================================

/** Select current view state */
export const useViewState = () =>
  useNavigationStore((state) => state.viewState);

/** Select view state with setter */
export const useViewStateActions = () =>
  useNavigationStore(
    useShallow((state) => ({
      viewState: state.viewState,
      setViewState: state.setViewState,
    })),
  );

/** Select navigation history actions — useShallow required because selector returns an object literal */
export const useNavigationHistory = () =>
  useNavigationStore(
    useShallow((state) => ({
      goBack: state.goBack,
      goForward: state.goForward,
    }))
  );

/** Check if navigation can go back */
export const useCanGoBack = () =>
  useNavigationStore((state) => state.historyIndex > 0);

/** Check if navigation can go forward */
export const useCanGoForward = () =>
  useNavigationStore(
    (state) => state.historyIndex < state.navigationHistory.length - 1,
  );
