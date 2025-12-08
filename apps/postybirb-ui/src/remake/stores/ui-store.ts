/**
 * Global UI state management using Zustand with localStorage persistence.
 * Manages all UI-related state including sidenav, drawers, and view preferences.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

/**
 * Drawer visibility keys.
 */
export type DrawerKey =
  | 'settings'
  | 'accounts'
  | 'tagGroups'
  | 'tagConverters'
  | 'userConverters'
  | 'notifications'
  | 'customShortcuts';

/**
 * Sub-navigation filter options.
 */
export type SubmissionFilter = 'all' | 'drafts' | 'scheduled' | 'posted' | 'failed';

/**
 * UI State interface.
 */
interface UIState {
  // Sidenav
  sidenavCollapsed: boolean;

  // Drawers - only one can be open at a time
  activeDrawer: DrawerKey | null;

  // View preferences
  fileSubmissionsFilter: SubmissionFilter;
  messageSubmissionsFilter: SubmissionFilter;

  // Sub-nav visibility per route
  subNavVisible: boolean;

  // Language/locale
  language: string;
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

  // Filter actions
  setFileSubmissionsFilter: (filter: SubmissionFilter) => void;
  setMessageSubmissionsFilter: (filter: SubmissionFilter) => void;

  // Sub-nav actions
  setSubNavVisible: (visible: boolean) => void;

  // Language actions
  setLanguage: (language: string) => void;

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
  fileSubmissionsFilter: 'all',
  messageSubmissionsFilter: 'all',
  subNavVisible: true,
  language: getDefaultLanguage(),
};

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb_ui-state';

/**
 * Zustand store with localStorage persistence.
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Sidenav actions
      toggleSidenav: () => set((state) => ({ sidenavCollapsed: !state.sidenavCollapsed })),
      setSidenavCollapsed: (collapsed) => set({ sidenavCollapsed: collapsed }),

      // Drawer actions - only one drawer open at a time
      openDrawer: (drawer) => set({ activeDrawer: drawer }),
      closeDrawer: () => set({ activeDrawer: null }),
      toggleDrawer: (drawer) =>
        set((state) => ({
          activeDrawer: state.activeDrawer === drawer ? null : drawer,
        })),

      // Filter actions
      setFileSubmissionsFilter: (filter) => set({ fileSubmissionsFilter: filter }),
      setMessageSubmissionsFilter: (filter) => set({ messageSubmissionsFilter: filter }),

      // Sub-nav actions
      setSubNavVisible: (visible) => set({ subNavVisible: visible }),

      // Language actions
      setLanguage: (language) => set({ language }),

      // Reset to initial state
      resetUIState: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields (exclude activeDrawer as it should reset on reload)
      partialize: (state) => ({
        sidenavCollapsed: state.sidenavCollapsed,
        fileSubmissionsFilter: state.fileSubmissionsFilter,
        messageSubmissionsFilter: state.messageSubmissionsFilter,
        subNavVisible: state.subNavVisible,
        language: state.language,
      }),
    }
  )
);

/**
 * Selector hooks for specific state slices.
 * Using selectors improves performance by preventing unnecessary re-renders.
 */

/** Select sidenav collapsed state */
export const useSidenavCollapsed = () => useUIStore((state) => state.sidenavCollapsed);

/** Select sidenav toggle action */
export const useToggleSidenav = () => useUIStore((state) => state.toggleSidenav);

/** Select active drawer */
export const useActiveDrawer = () => useUIStore((state) => state.activeDrawer);

/** Select drawer actions */
export const useDrawerActions = () =>
  useUIStore(
    useShallow((state) => ({
      openDrawer: state.openDrawer,
      closeDrawer: state.closeDrawer,
      toggleDrawer: state.toggleDrawer,
    }))
  );

/** Select file submissions filter */
export const useFileSubmissionsFilter = () =>
  useUIStore(
    useShallow((state) => ({
      filter: state.fileSubmissionsFilter,
      setFilter: state.setFileSubmissionsFilter,
    }))
  );

/** Select message submissions filter */
export const useMessageSubmissionsFilter = () =>
  useUIStore(
    useShallow((state) => ({
      filter: state.messageSubmissionsFilter,
      setFilter: state.setMessageSubmissionsFilter,
    }))
  );

/** Select sub-nav visibility */
export const useSubNavVisible = () =>
  useUIStore(
    useShallow((state) => ({
      visible: state.subNavVisible,
      setVisible: state.setSubNavVisible,
    }))
  );

/** Select language state */
export const useLanguage = () => useUIStore((state) => state.language);

/** Select language actions */
export const useLanguageActions = () =>
  useUIStore(
    useShallow((state) => ({
      language: state.language,
      setLanguage: state.setLanguage,
    }))
  );
