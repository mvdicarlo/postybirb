/**
 * Global UI state management using Zustand with localStorage persistence.
 * Manages all UI-related state including sidenav, drawers, and view preferences.
 */

import { SubmissionType } from '@postybirb/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { AccountLoginFilter } from '../types/account-filters';
import {
  createAccountsViewState,
  createFileSubmissionsViewState,
  createHomeViewState,
  createMessageSubmissionsViewState,
  createTemplatesViewState,
  defaultViewState,
  type SectionId,
  type ViewState,
} from '../types/view-state';
import { useAccountStore } from './account-store';
import { useSubmissionStore } from './submission-store';

/**
 * Drawer visibility keys.
 */
export type DrawerKey =
  | 'settings'
  | 'tagGroups'
  | 'tagConverters'
  | 'userConverters'
  | 'notifications'
  | 'customShortcuts'
  | 'fileWatchers'
  | 'schedule';

/**
 * Sub-navigation filter options.
 */
export type SubmissionFilter =
  | 'all'
  | 'drafts'
  | 'scheduled'
  | 'posted'
  | 'failed';

// Re-export AccountLoginFilter enum from types
export { AccountLoginFilter } from '../types/account-filters';

/**
 * Color scheme options (matches Mantine's MantineColorScheme).
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * Valid Mantine primary colors.
 */
export const MANTINE_COLORS = [
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
] as const;

export type MantinePrimaryColor = (typeof MANTINE_COLORS)[number];

/**
 * UI State interface.
 */
interface UIState {
  // Sidenav
  sidenavCollapsed: boolean;

  // Drawers - only one can be open at a time
  activeDrawer: DrawerKey | null;

  // View state - controls which section/view is active and its parameters
  viewState: ViewState;

  // View state cache - preserves per-view state when switching between views (persisted)
  viewStateCache: Partial<Record<SectionId, ViewState>>;

  // Navigation history - tracks view navigation for back/forward (in-memory only, max 30)
  navigationHistory: SectionId[];
  historyIndex: number;

  // View preferences
  fileSubmissionsFilter: SubmissionFilter;
  fileSubmissionsSearchQuery: string;
  messageSubmissionsFilter: SubmissionFilter;
  messageSubmissionsSearchQuery: string;

  // Sub-nav visibility per route
  subNavVisible: boolean;

  // Submissions primary content preferences
  submissionsPreferMultiEdit: boolean;
  submissionsFullView: boolean;

  // Language/locale
  language: string;

  // Appearance
  colorScheme: ColorScheme;
  primaryColor: MantinePrimaryColor;

  // Accounts section
  hiddenWebsites: string[];
  accountsSearchQuery: string;
  accountsLoginFilter: AccountLoginFilter;

  // Templates section
  templatesTabType: SubmissionType;
  templatesSearchQuery: string;
}

/**
 * UI Actions interface.
 */
interface UIActions {
  // Sidenav actions
  toggleSidenav: () => void;
  setSidenavCollapsed: (collapsed: boolean) => void;

  // Drawer actions
  openDrawer: (drawer: DrawerKey) => void;
  closeDrawer: () => void;
  toggleDrawer: (drawer: DrawerKey) => void;

  // View state actions
  setViewState: (viewState: ViewState) => void;

  // Navigation history actions
  goBack: () => void;
  goForward: () => void;

  // Filter actions
  setFileSubmissionsFilter: (filter: SubmissionFilter) => void;
  setFileSubmissionsSearchQuery: (query: string) => void;
  setMessageSubmissionsFilter: (filter: SubmissionFilter) => void;
  setMessageSubmissionsSearchQuery: (query: string) => void;

  // Sub-nav actions
  setSubNavVisible: (visible: boolean) => void;
  toggleSubNavVisible: () => void;

  // Submissions primary content preferences
  setSubmissionsPreferMultiEdit: (preferMultiEdit: boolean) => void;
  setSubmissionsFullView: (fullView: boolean) => void;

  // Language actions
  setLanguage: (language: string) => void;

  // Appearance actions
  setColorScheme: (scheme: ColorScheme) => void;
  setPrimaryColor: (color: MantinePrimaryColor) => void;

  // Accounts section actions
  setHiddenWebsites: (websiteIds: string[]) => void;
  toggleWebsiteVisibility: (websiteId: string) => void;
  setAccountsSearchQuery: (query: string) => void;
  setAccountsLoginFilter: (filter: AccountLoginFilter) => void;

  // Templates section actions
  setTemplatesTabType: (type: SubmissionType) => void;
  setTemplatesSearchQuery: (query: string) => void;

  // Reset
  resetUIState: () => void;
}

/**
 * Complete UI Store type.
 */
export type UIStore = UIState & UIActions;

/**
 * Supported locale codes for the application.
 */
const SUPPORTED_LOCALES = ['en', 'de', 'lt', 'pt-BR', 'ru', 'es', 'ta'];

/**
 * Get default language from browser or fall back to English.
 * Matches browser locale against supported locales.
 */
const getDefaultLanguage = (): string => {
  if (typeof navigator !== 'undefined') {
    const browserLocale = navigator.language;

    // Check for exact match first (e.g., pt-BR)
    if (SUPPORTED_LOCALES.includes(browserLocale)) {
      return browserLocale;
    }

    // Try base language (e.g., en-US -> en)
    const baseLocale = browserLocale.split('-')[0];
    if (SUPPORTED_LOCALES.includes(baseLocale)) {
      return baseLocale;
    }
  }
  return 'en';
};

/**
 * Initial/default UI state.
 */
const initialState: UIState = {
  sidenavCollapsed: false,
  activeDrawer: null,
  viewState: defaultViewState,
  viewStateCache: {},
  navigationHistory: ['home'],
  historyIndex: 0,
  fileSubmissionsFilter: 'all',
  fileSubmissionsSearchQuery: '',
  messageSubmissionsFilter: 'all',
  messageSubmissionsSearchQuery: '',
  subNavVisible: true,
  submissionsPreferMultiEdit: true,
  submissionsFullView: false,
  language: getDefaultLanguage(),
  colorScheme: 'auto',
  primaryColor: 'red',
  hiddenWebsites: [],
  accountsSearchQuery: '',
  accountsLoginFilter: AccountLoginFilter.All,
  templatesTabType: SubmissionType.FILE,
  templatesSearchQuery: '',
};

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb_ui-state';

/**
 * Maximum number of entries in navigation history.
 */
const MAX_HISTORY_LENGTH = 30;

/**
 * Validate and clean a view state by checking if referenced entity IDs exist.
 * Silently removes invalid selections.
 */
function validateViewState(viewState: ViewState): ViewState {
  const submissionsMap = useSubmissionStore.getState().recordsMap;
  const accountsMap = useAccountStore.getState().recordsMap;

  switch (viewState.type) {
    case 'file-submissions': {
      // Validate submission IDs exist
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
      // Validate submission IDs exist
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
      // Validate account ID exists
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
      // Validate template ID exists (templates are also submissions)
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

/**
 * Zustand store with localStorage persistence.
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Sidenav actions
      toggleSidenav: () =>
        set((state) => ({ sidenavCollapsed: !state.sidenavCollapsed })),
      setSidenavCollapsed: (collapsed) => set({ sidenavCollapsed: collapsed }),

      // Drawer actions - only one drawer open at a time
      openDrawer: (drawer) => set({ activeDrawer: drawer }),
      closeDrawer: () => set({ activeDrawer: null }),
      toggleDrawer: (drawer) =>
        set((state) => ({
          activeDrawer: state.activeDrawer === drawer ? null : drawer,
        })),

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

          if (isNavigatingToNewSection) {
            // Navigating to a different section: restore from cache or use provided state
            const cachedState = newCache[viewState.type];
            if (cachedState && cachedState.type === viewState.type) {
              // Restore from cache and validate
              finalViewState = validateViewState(cachedState);
            } else {
              // First visit to this section or explicit state provided
              finalViewState = viewState;
            }
          } else {
            // Staying in the same section: use the provided state (updating params)
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

      // Submissions primary content preferences
      setSubmissionsPreferMultiEdit: (submissionsPreferMultiEdit) =>
        set({ submissionsPreferMultiEdit }),
      setSubmissionsFullView: (submissionsFullView) =>
        set({ submissionsFullView }),

      // Language actions
      setLanguage: (language) => set({ language }),

      // Appearance actions
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),

      // Accounts section actions
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

      // Templates section actions
      setTemplatesTabType: (templatesTabType) => set({ templatesTabType }),
      setTemplatesSearchQuery: (templatesSearchQuery) =>
        set({ templatesSearchQuery }),

      // Reset to initial state
      resetUIState: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persist state to localStorage (excludes activeDrawer, history, and historyIndex)
      partialize: (state) => ({
        sidenavCollapsed: state.sidenavCollapsed,
        viewState: state.viewState,
        viewStateCache: state.viewStateCache,
        fileSubmissionsFilter: state.fileSubmissionsFilter,
        fileSubmissionsSearchQuery: state.fileSubmissionsSearchQuery,
        messageSubmissionsFilter: state.messageSubmissionsFilter,
        messageSubmissionsSearchQuery: state.messageSubmissionsSearchQuery,
        subNavVisible: state.subNavVisible,
        submissionsPreferMultiEdit: state.submissionsPreferMultiEdit,
        submissionsFullView: state.submissionsFullView,
        language: state.language,
        colorScheme: state.colorScheme,
        primaryColor: state.primaryColor,
        hiddenWebsites: state.hiddenWebsites,
        accountsSearchQuery: state.accountsSearchQuery,
        accountsLoginFilter: state.accountsLoginFilter,
        templatesTabType: state.templatesTabType,
        templatesSearchQuery: state.templatesSearchQuery,
      }),
    },
  ),
);

/**
 * Selector hooks for specific state slices.
 * Using selectors improves performance by preventing unnecessary re-renders.
 */

/** Select sidenav collapsed state */
export const useSidenavCollapsed = () =>
  useUIStore((state) => state.sidenavCollapsed);

/** Select sidenav toggle action */
export const useToggleSidenav = () =>
  useUIStore((state) => state.toggleSidenav);

/** Select active drawer */
export const useActiveDrawer = () => useUIStore((state) => state.activeDrawer);

/** Select drawer actions */
export const useDrawerActions = () =>
  useUIStore(
    useShallow((state) => ({
      openDrawer: state.openDrawer,
      closeDrawer: state.closeDrawer,
      toggleDrawer: state.toggleDrawer,
    })),
  );

/** Select file submissions filter and search query */
export const useFileSubmissionsFilter = () =>
  useUIStore(
    useShallow((state) => ({
      filter: state.fileSubmissionsFilter,
      searchQuery: state.fileSubmissionsSearchQuery,
      setFilter: state.setFileSubmissionsFilter,
      setSearchQuery: state.setFileSubmissionsSearchQuery,
    })),
  );

/** Select message submissions filter and search query */
export const useMessageSubmissionsFilter = () =>
  useUIStore(
    useShallow((state) => ({
      filter: state.messageSubmissionsFilter,
      searchQuery: state.messageSubmissionsSearchQuery,
      setFilter: state.setMessageSubmissionsFilter,
      setSearchQuery: state.setMessageSubmissionsSearchQuery,
    })),
  );

/** Generic submissions filter hook - returns filter state based on submission type */
export const useSubmissionsFilter = (type: SubmissionType) =>
  useUIStore(
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
  useUIStore(
    useShallow((state) => ({
      visible: state.subNavVisible,
      setVisible: state.setSubNavVisible,
    })),
  );

/** Select language state */
export const useLanguage = () => useUIStore((state) => state.language);

/** Select language actions */
export const useLanguageActions = () =>
  useUIStore(
    useShallow((state) => ({
      language: state.language,
      setLanguage: state.setLanguage,
    })),
  );

/** Select color scheme */
export const useColorScheme = () => useUIStore((state) => state.colorScheme);

/** Select primary color */
export const usePrimaryColor = () => useUIStore((state) => state.primaryColor);

/** Select appearance actions */
export const useAppearanceActions = () =>
  useUIStore(
    useShallow((state) => ({
      colorScheme: state.colorScheme,
      primaryColor: state.primaryColor,
      setColorScheme: state.setColorScheme,
      setPrimaryColor: state.setPrimaryColor,
    })),
  );

/** Select view state */
export const useViewState = () => useUIStore((state) => state.viewState);

/** Select view state actions */
export const useViewStateActions = () =>
  useUIStore(
    useShallow((state) => ({
      viewState: state.viewState,
      setViewState: state.setViewState,
    })),
  );

/**
 * Toggle section panel visibility hook.
 */
export const useToggleSectionPanel = () =>
  useUIStore((state) => state.toggleSubNavVisible);

/** Select submissions primary content preferences */
export const useSubmissionsContentPreferences = () =>
  useUIStore(
    useShallow((state) => ({
      preferMultiEdit: state.submissionsPreferMultiEdit,
      fullView: state.submissionsFullView,
      setPreferMultiEdit: state.setSubmissionsPreferMultiEdit,
      setFullView: state.setSubmissionsFullView,
    })),
  );

// ============================================================================
// Accounts Section Selectors
// ============================================================================

/** Select hidden websites */
export const useHiddenWebsites = () =>
  useUIStore((state) => state.hiddenWebsites);

/** Select accounts section filter state and actions */
export const useAccountsFilter = () =>
  useUIStore(
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

// ============================================================================
// Templates Section Selectors
// ============================================================================

/** Select templates section filter state and actions */
export const useTemplatesFilter = () =>
  useUIStore(
    useShallow((state) => ({
      tabType: state.templatesTabType,
      searchQuery: state.templatesSearchQuery,
      setTabType: state.setTemplatesTabType,
      setSearchQuery: state.setTemplatesSearchQuery,
    })),
  );

// ============================================================================
// Navigation History Selectors
// ============================================================================

/** Select navigation history actions */
export const useNavigationHistory = () =>
  useUIStore(
    useShallow((state) => ({
      goBack: state.goBack,
      goForward: state.goForward,
    })),
  );

/** Check if navigation can go back */
export const useCanGoBack = () => useUIStore((state) => state.historyIndex > 0);

/** Check if navigation can go forward */
export const useCanGoForward = () =>
  useUIStore(
    (state) => state.historyIndex < state.navigationHistory.length - 1,
  );
