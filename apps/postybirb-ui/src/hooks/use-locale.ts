/**
 * useLocale - Centralized hook for locale-aware formatting.
 * Provides the current locale and utilities for date/time formatting.
 * Auto-subscribes to locale changes via lingui.
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo } from 'react';
import {
  calendarLanguageMap,
  cronstrueLocaleMap,
  dateLocaleMap,
} from '../i18n/languages';
import { useLocaleStore } from '../stores/ui/locale-store';

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

/**
 * Return type for the useLocale hook.
 */
export interface UseLocaleResult {
  /** Current app locale code (e.g., 'en', 'de', 'pt-BR') */
  locale: string;

  /** Locale code for date libraries (dayjs) */
  dateLocale: string;

  /** Locale code for FullCalendar */
  calendarLocale: string | object;

  /** Locale code for cronstrue */
  cronstrueLocale: string;

  /** From 0 to 6, Sunday = 0, Monday = 1, Saturday = 6 */
  startOfWeek: number;

  hourCycle: Intl.LocaleHourCycleKey;

  /** Default value for current locale */
  defaultStartOfWeek: number;

  /** Default value for current locale */
  defaultHourCycle: Intl.LocaleHourCycleKey;

  dayjsDateTimeFormat: string;

  /** Format a date as relative time (e.g., "2 hours ago", "in 3 days") */
  formatRelativeTime: (date: Date | string) => string;

  /** Format a date/time for display using locale-aware formatting */
  formatDateTime: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;

  /** Format a date only (no time) for display */
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;

  /** Format a time only (no date) for display */
  formatTime: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * Centralized hook for locale-aware formatting.
 * Uses lingui's i18n context to automatically re-render on locale changes.
 *
 * @example
 * ```tsx
 * const { locale, formatRelativeTime, formatDateTime } = useLocale();
 *
 * // Format relative time
 * <Text>{formatRelativeTime(submission.lastModified)}</Text>
 *
 * // Format date/time
 * <Text>{formatDateTime(submission.scheduledDate)}</Text>
 * ```
 */
export function useLocale(): UseLocaleResult {
  const store = useLocaleStore();
  const locale = store.language;

  // Map the app locale to library-specific locale codes
  const dateLocale = dateLocaleMap[locale] || locale;
  const calendarLocale = calendarLanguageMap[locale] || 'en-US';
  const cronstrueLocale = cronstrueLocaleMap[locale] || 'en';

  const defaultLocaleInfo = useMemo(() => getLocaleInfo(locale), [locale]);

  const startOfWeek =
    store.startOfWeek === 'locale'
      ? defaultLocaleInfo.startOfWeek
      : store.startOfWeek;
  const hourCycle =
    store.hourCycle === 'locale'
      ? defaultLocaleInfo.hourCycle
      : store.hourCycle;

  const dayjsDateTimeFormat =
    // eslint-disable-next-line lingui/no-unlocalized-strings
    hourCycle === 'h24' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD hh:mm A';

  // Set dayjs locale as a proper side effect (not inside useMemo)
  useEffect(() => {
    dayjs.locale(dateLocale);
  }, [dateLocale]);

  // Memoize the formatting functions to avoid recreating on each render
  const formatters = useMemo(() => {
    const formatRelativeTime = (date: Date | string): string =>
      dayjs(date).fromNow();

    const formatDateTime = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = {
        ...DEFAULT_DATETIME_OPTIONS,
        hourCycle,
      },
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString(locale, options);
    };

    const formatDate = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString(locale, options);
    };

    const formatTime = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = {
        ...DEFAULT_TIME_OPTIONS,
        hourCycle,
      },
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString(locale, options);
    };

    return { formatRelativeTime, formatDateTime, formatDate, formatTime };
  }, [locale, hourCycle]);

  return {
    startOfWeek,
    hourCycle,
    defaultHourCycle: defaultLocaleInfo.hourCycle,
    defaultStartOfWeek: defaultLocaleInfo.startOfWeek,
    dayjsDateTimeFormat,
    locale,
    dateLocale,
    calendarLocale,
    cronstrueLocale,
    ...formatters,
  };
}

function getLocaleInfo(locale: string) {
  try {
    const intlLocale = new Intl.Locale(locale);

    // @ts-expect-error typings were included into typescript 6.0
    const weekInfo = intlLocale.getWeekInfo() as WeekInfo;

    return {
      // % 7 Converts a first-day-of-week value from Monday-based (1–7) to Sunday-based (0–6)
      startOfWeek: weekInfo.firstDay % 7,
      hourCycle: intlLocale.hourCycle ?? 'h24',
    };
  } catch (e) {
    // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
    console.error('Failed to get locale info', e);
    return {
      startOfWeek: 0,
      hourCycle: 'h24' as const,
    };
  }
}

interface WeekInfo {
  firstDay: number; // 1 (Monday) to 7 (Sunday)
  weekend: number[]; // Days of the weekend (e.g., [6, 7])
  minimalDays: number; // Minimal days for the first week of the year (1-7)
}
