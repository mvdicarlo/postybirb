/**
 * Templates UI state management using Zustand with localStorage persistence.
 * Manages template section filters and tab preferences.
 */

import { SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useTemplateSubmissions } from '../entity/submission-store';

// ============================================================================
// Types
// ============================================================================

/** Sort direction for template name sorting. */
export type TemplateSortOrder = 'asc' | 'desc';

/**
 * Templates UI state interface.
 */
interface TemplatesUIState {
  /** Currently selected template tab type */
  templatesTabType: SubmissionType;

  /** Templates search query */
  templatesSearchQuery: string;

  /** Template name sort order */
  templatesSortOrder: TemplateSortOrder;
}

/**
 * Templates UI actions interface.
 */
interface TemplatesUIActions {
  /** Set templates tab type */
  setTemplatesTabType: (type: SubmissionType) => void;

  /** Set templates search query */
  setTemplatesSearchQuery: (query: string) => void;

  /** Set template name sort order */
  setTemplatesSortOrder: (order: TemplateSortOrder) => void;

  /** Toggle sort order between asc and desc */
  toggleTemplatesSortOrder: () => void;

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
  templatesSortOrder: 'asc',
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
      setTemplatesSortOrder: (templatesSortOrder) =>
        set({ templatesSortOrder }),
      toggleTemplatesSortOrder: () =>
        set((state) => ({
          templatesSortOrder:
            state.templatesSortOrder === 'asc' ? 'desc' : 'asc',
        })),

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
      sortOrder: state.templatesSortOrder,
      setTabType: state.setTemplatesTabType,
      setSearchQuery: state.setTemplatesSearchQuery,
      setSortOrder: state.setTemplatesSortOrder,
      toggleSortOrder: state.toggleTemplatesSortOrder,
    })),
  );

export const useSortedTemplateSubmissions = (type?: SubmissionType) => {
  const templates = useTemplateSubmissions();
  const { sortOrder } = useTemplatesFilter();

  return useMemo(() => {
    let sorted = templates.toSorted((a, b) => {
      const nameA = (a.title ?? '').toLowerCase();
      const nameB = (b.title ?? '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    if (type) {
      sorted = sorted.filter((template) => template.type === type);
    }

    return sorted;
  }, [templates, sortOrder, type]);
};
