/**
 * Locale state management using Zustand with localStorage persistence.
 * Manages language/locale settings for the application.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { supportedLocaleCodes } from '../../i18n/languages';

type HourCycle = 'h12' | 'h24' | 'system' | 'locale';

type StartOfWeek = number | 'system' | 'locale';

// ============================================================================
// Types
// ============================================================================

/**
 * Locale state interface.
 */
interface LocaleState {
  /** Current language code */
  language: string;

  /**
   * 24 hours or 12 hours (AM/PM)
  * system and the legacy locale value use the viewing device's region
   */
  hourCycle: HourCycle;

  /**
   * 0=Sunday, 1=Monday, 6=Saturday
  * system and the legacy locale value use the viewing device's region
   */
  startOfWeek: StartOfWeek;
}

/**
 * Locale actions interface.
 */
interface LocaleActions {
  /** Set the language */
  setLanguage: (language: string) => void;

  /** Reset locale state */
  resetLocale: () => void;

  setHourCycle: (hourCycle: HourCycle) => void;

  setStartOfWeek: (startOfWeek: StartOfWeek) => void;
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
    if ((supportedLocaleCodes as string[]).includes(browserLocale)) {
      return browserLocale;
    }

    // Try base language (e.g., en-US -> en)
    const baseLocale = browserLocale.split('-')[0];
    if ((supportedLocaleCodes as string[]).includes(baseLocale)) {
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
  startOfWeek: 'system',
  hourCycle: 'system',
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

      setHourCycle: (hourCycle) => set({ hourCycle }),

      setStartOfWeek: (startOfWeek) => set({ startOfWeek }),

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

      startOfWeek: state.startOfWeek,
      setStartOfWeek: state.setStartOfWeek,

      hourCycle: state.hourCycle,
      setHourCycle: state.setHourCycle,
    })),
  );
