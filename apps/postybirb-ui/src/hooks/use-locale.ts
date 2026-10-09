/**
 * useLocale - Centralized hook for locale-aware formatting.
 * Provides the current locale and utilities for date/time formatting.
 * Auto-subscribes to locale changes via lingui.
 */

import { useLingui } from '@lingui/react/macro';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo } from 'react';
import {
    calendarLanguageMap,
    cronstrueLocaleMap,
    dateLocaleMap,
} from '../i18n/languages';
import { useLocaleStore } from '../stores/ui/locale-store';
import {
    createDateFormatters,
    getDayjsDateTimeFormat,
    getLocaleInfo,
    getWeekdays,
    resolveRegionalLocale,
} from './locale-utils';

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(duration);

/**
 * Return type for the useLocale hook.
 */
export interface UseLocaleResult {
  /** Current app locale code (e.g., 'en', 'de', 'pt-BR') */
  locale: string;

  regionalLocale: string;

  weekdays: { value: string; label: string }[];

  amPmLabels: { am: string; pm: string };

  /** Locale code for date libraries (dayjs) */
  dateLocale: string;

  /** Locale code for FullCalendar */
  calendarLocale: string | object;

  /** Locale code for cronstrue */
  cronstrueLocale: string;

  /** From 0 to 6, Sunday = 0, Monday = 1, Saturday = 6 */
  startOfWeek: number;

  hourCycle: 'h12' | 'h24';

  /** Default value for the viewing device's region */
  defaultStartOfWeek: number;

  /** Default value for the viewing device's region */
  defaultHourCycle: 'h12' | 'h24';

  dayjsDateTimeFormat: string;

  /** Format a date as relative time (e.g., "2 hours ago", "in 3 days") */
  formatRelativeTime: (date: Date | string) => string;

  /** Format a milliseconds as duration (e.g., "2 hours", "3 minutes") */
  formatDuration: (duration: number) => string;

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
  const { t } = useLingui();
  const store = useLocaleStore();
  const locale = store.language;
  const regionalLocale = resolveRegionalLocale(
    typeof window === 'undefined' ? undefined : window.electron?.systemLocale,
    Intl.DateTimeFormat().resolvedOptions().locale,
    typeof navigator === 'undefined' ? undefined : navigator.language,
  );

  // Map the app locale to library-specific locale codes
  const dateLocale = dateLocaleMap[locale] || locale;
  const calendarLocale = calendarLanguageMap[locale] || 'en-US';
  const cronstrueLocale = cronstrueLocaleMap[locale] || 'en';

  const defaultLocaleInfo = useMemo(
    () => getLocaleInfo(regionalLocale),
    [regionalLocale],
  );

  const startOfWeek =
    typeof store.startOfWeek !== 'number'
      ? defaultLocaleInfo.startOfWeek
      : store.startOfWeek;
  const hourCycle =
    store.hourCycle === 'locale' || store.hourCycle === 'system'
      ? defaultLocaleInfo.hourCycle
      : store.hourCycle;

  const dayjsDateTimeFormat = getDayjsDateTimeFormat(regionalLocale, hourCycle);
  const weekdays = getWeekdays(locale, startOfWeek);
  const am = t`AM`;
  const pm = t`PM`;

  // Set dayjs locale as a proper side effect (not inside useMemo)
  useEffect(() => {
    dayjs.locale(dateLocale);
  }, [dateLocale]);

  // Memoize the formatting functions to avoid recreating on each render
  const formatters = useMemo(() => {
    const formatRelativeTime = (date: Date | string): string =>
      dayjs(date).locale(dateLocale).fromNow();

    const formatDuration = (time: number) =>
      // eslint-disable-next-line lingui/no-unlocalized-strings
      dayjs.duration(time).format('HH:mm:ss');

    return {
      ...createDateFormatters(locale, regionalLocale, hourCycle, { am, pm }),
      formatRelativeTime,
      formatDuration,
    };
  }, [locale, regionalLocale, hourCycle, dateLocale, am, pm]);

  return {
    regionalLocale,
    weekdays,
    amPmLabels: { am, pm },
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
