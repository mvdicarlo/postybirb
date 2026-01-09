/**
 * Locale state management using Zustand with localStorage persistence.
 * Manages language/locale settings for the application.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Types
// ============================================================================

/**
 * Locale state interface.
 */
interface LocaleState {
  /** Current language code */
  language: string;
}

/**
 * Locale actions interface.
 */
interface LocaleActions {
  /** Set the language */
  setLanguage: (language: string) => void;

  /** Reset locale state */
  resetLocale: () => void;
}

/**
 * Complete Locale Store type.
 */
export type LocaleStore = LocaleState & LocaleActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-locale';

/**
 * Supported locale codes for the application.
 */
export const SUPPORTED_LOCALES = ['en', 'de', 'lt', 'pt-BR', 'ru', 'es', 'ta'];

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default locale state.
 */
const initialState: LocaleState = {
  language: getDefaultLanguage(),
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for locale with localStorage persistence.
 */
export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setLanguage: (language) => set({ language }),

      // Reset to initial state
      resetLocale: () => set(initialState),
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

/** Select language state */
export const useLanguage = () => useLocaleStore((state) => state.language);

/** Select language actions */
export const useLanguageActions = () =>
  useLocaleStore(
    useShallow((state) => ({
      language: state.language,
      setLanguage: state.setLanguage,
    })),
  );
