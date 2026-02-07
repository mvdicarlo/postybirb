/**
 * useLocale - Centralized hook for locale-aware formatting.
 * Provides the current locale and utilities for date/time formatting.
 * Auto-subscribes to locale changes via lingui.
 */

import { useLingui } from '@lingui/react';
import moment from 'moment/min/moment-with-locales';
import { useEffect, useMemo } from 'react';
import {
    blockNoteLocaleLanguageMap,
    calendarLanguageMap,
    cronstrueLocaleMap,
    dateLocaleMap,
} from '../i18n/languages';

/**
 * Return type for the useLocale hook.
 */
export interface UseLocaleResult {
  /** Current app locale code (e.g., 'en', 'de', 'pt-BR') */
  locale: string;
  /** Locale code for date libraries (dayjs/moment) */
  dateLocale: string;
  /** Locale code for FullCalendar */
  calendarLocale: string;
  /** Locale code for cronstrue */
  cronstrueLocale: string;
  /** Locale dictionary for BlockNote editor */
  blockNoteLocale: Record<string, unknown>;
  /** Format a date as relative time (e.g., "2 hours ago", "in 3 days") */
  formatRelativeTime: (date: Date | string) => string;
  /** Format a date/time for display using locale-aware formatting */
  formatDateTime: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  /** Format a date only (no time) for display */
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  /** Format a time only (no date) for display */
  formatTime: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
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
  const { i18n } = useLingui();
  const locale = i18n.locale || 'en';

  // Map the app locale to library-specific locale codes
  const dateLocale = dateLocaleMap[locale] || locale;
  const calendarLocale = calendarLanguageMap[locale] || 'en-US';
  const cronstrueLocale = cronstrueLocaleMap[locale] || 'en';
  const blockNoteLocale = blockNoteLocaleLanguageMap[locale] || blockNoteLocaleLanguageMap.en;

  // Set moment locale as a proper side effect (not inside useMemo)
  useEffect(() => {
    moment.locale(dateLocale);
  }, [dateLocale]);

  // Memoize the formatting functions to avoid recreating on each render
  const formatters = useMemo(() => {
    const formatRelativeTime = (date: Date | string): string =>
      moment(date).fromNow();

    const formatDateTime = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME_OPTIONS
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString(locale, options);
    };

    const formatDate = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString(locale, options);
    };

    const formatTime = (
      date: Date | string,
      options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString(locale, options);
    };

    return { formatRelativeTime, formatDateTime, formatDate, formatTime };
  }, [locale, dateLocale]);

  return {
    locale,
    dateLocale,
    calendarLocale,
    cronstrueLocale,
    blockNoteLocale,
    ...formatters,
  };
}
