/**
 * Submissions UI state management using Zustand with localStorage persistence.
 * Manages submission filters, sidenav, and content preferences.
 */

import { SubmissionType } from '@postybirb/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Types
// ============================================================================

/**
 * Sub-navigation filter options.
 */
export type SubmissionFilter =
  | 'all'
  | 'queued'
  | 'scheduled'
  | 'posted'
  | 'failed';

/**
 * Submissions UI state interface.
 */
interface SubmissionsUIState {
  /** Whether the sidenav is collapsed */
  sidenavCollapsed: boolean;

  /** File submissions filter */
  fileSubmissionsFilter: SubmissionFilter;

  /** File submissions search query */
  fileSubmissionsSearchQuery: string;

  /** Message submissions filter */
  messageSubmissionsFilter: SubmissionFilter;

  /** Message submissions search query */
  messageSubmissionsSearchQuery: string;

  /** Whether sub-nav is visible */
  subNavVisible: boolean;

  /** Whether to prefer multi-edit in submissions primary content */
  submissionsPreferMultiEdit: boolean;
}

/**
 * Submissions UI actions interface.
 */
interface SubmissionsUIActions {
  /** Toggle sidenav collapsed state */
  toggleSidenav: () => void;

  /** Set sidenav collapsed state */
  setSidenavCollapsed: (collapsed: boolean) => void;

  /** Set file submissions filter */
  setFileSubmissionsFilter: (filter: SubmissionFilter) => void;

  /** Set file submissions search query */
  setFileSubmissionsSearchQuery: (query: string) => void;

  /** Set message submissions filter */
  setMessageSubmissionsFilter: (filter: SubmissionFilter) => void;

  /** Set message submissions search query */
  setMessageSubmissionsSearchQuery: (query: string) => void;

  /** Set sub-nav visibility */
  setSubNavVisible: (visible: boolean) => void;

  /** Toggle sub-nav visibility */
  toggleSubNavVisible: () => void;

  /** Set multi-edit preference */
  setSubmissionsPreferMultiEdit: (preferMultiEdit: boolean) => void;

  /** Reset submissions UI state */
  resetSubmissionsUI: () => void;
}

/**
 * Complete Submissions UI Store type.
 */
export type SubmissionsUIStore = SubmissionsUIState & SubmissionsUIActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-submissions-ui';

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default submissions UI state.
 */
const initialState: SubmissionsUIState = {
  sidenavCollapsed: false,
  fileSubmissionsFilter: 'all',
  fileSubmissionsSearchQuery: '',
  messageSubmissionsFilter: 'all',
  messageSubmissionsSearchQuery: '',
  subNavVisible: true,
  submissionsPreferMultiEdit: false,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for submissions UI with localStorage persistence.
 */
export const useSubmissionsUIStore = create<SubmissionsUIStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Sidenav actions
      toggleSidenav: () =>
        set((state) => ({ sidenavCollapsed: !state.sidenavCollapsed })),
      setSidenavCollapsed: (collapsed) => set({ sidenavCollapsed: collapsed }),

      // Filter actions
      setFileSubmissionsFilter: (filter) =>
        set({ fileSubmissionsFilter: filter }),
      setFileSubmissionsSearchQuery: (query) =>
        set({ fileSubmissionsSearchQuery: query }),
      setMessageSubmissionsFilter: (filter) =>
        set({ messageSubmissionsFilter: filter }),
      setMessageSubmissionsSearchQuery: (query) =>
        set({ messageSubmissionsSearchQuery: query }),

      // Sub-nav actions
      setSubNavVisible: (visible) => set({ subNavVisible: visible }),
      toggleSubNavVisible: () =>
        set((state) => ({ subNavVisible: !state.subNavVisible })),

      // Content preferences
      setSubmissionsPreferMultiEdit: (submissionsPreferMultiEdit) =>
        set({ submissionsPreferMultiEdit }),

      // Reset to initial state
      resetSubmissionsUI: () => set(initialState),
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

/** Select sidenav collapsed state */
export const useSidenavCollapsed = () =>
  useSubmissionsUIStore((state) => state.sidenavCollapsed);

/** Select sidenav toggle action */
export const useToggleSidenav = () =>
  useSubmissionsUIStore((state) => state.toggleSidenav);

/** Select file submissions filter and search query */
export const useFileSubmissionsFilter = () =>
  useSubmissionsUIStore(
    useShallow((state) => ({
      filter: state.fileSubmissionsFilter,
      searchQuery: state.fileSubmissionsSearchQuery,
      setFilter: state.setFileSubmissionsFilter,
      setSearchQuery: state.setFileSubmissionsSearchQuery,
    })),
  );

/** Select message submissions filter and search query */
export const useMessageSubmissionsFilter = () =>
  useSubmissionsUIStore(
    useShallow((state) => ({
      filter: state.messageSubmissionsFilter,
      searchQuery: state.messageSubmissionsSearchQuery,
      setFilter: state.setMessageSubmissionsFilter,
      setSearchQuery: state.setMessageSubmissionsSearchQuery,
    })),
  );

/** Generic submissions filter hook - returns filter state based on submission type */
export const useSubmissionsFilter = (type: SubmissionType) =>
  useSubmissionsUIStore(
    useShallow((state) =>
      type === SubmissionType.FILE
        ? {
            filter: state.fileSubmissionsFilter,
            searchQuery: state.fileSubmissionsSearchQuery,
            setFilter: state.setFileSubmissionsFilter,
            setSearchQuery: state.setFileSubmissionsSearchQuery,
          }
        : {
            filter: state.messageSubmissionsFilter,
            searchQuery: state.messageSubmissionsSearchQuery,
            setFilter: state.setMessageSubmissionsFilter,
            setSearchQuery: state.setMessageSubmissionsSearchQuery,
          },
    ),
  );

/** Select sub-nav visibility */
export const useSubNavVisible = () =>
  useSubmissionsUIStore(
    useShallow((state) => ({
      visible: state.subNavVisible,
      setVisible: state.setSubNavVisible,
    })),
  );

/** Toggle section panel visibility hook */
export const useToggleSectionPanel = () =>
  useSubmissionsUIStore((state) => state.toggleSubNavVisible);

/** Select submissions primary content preferences */
export const useSubmissionsContentPreferences = () =>
  useSubmissionsUIStore(
    useShallow((state) => ({
      preferMultiEdit: state.submissionsPreferMultiEdit,
      setPreferMultiEdit: state.setSubmissionsPreferMultiEdit,
    })),
  );
