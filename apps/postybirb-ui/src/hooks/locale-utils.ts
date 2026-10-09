/* eslint-disable lingui/no-unlocalized-strings */
export type ClockFormat = 'h12' | 'h24';

export function resolveRegionalLocale(...candidates: (string | undefined)[]) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new Intl.Locale(candidate).toString();
    } catch {
      continue;
    }
  }
  return 'en-GB';
}

export function getLocaleInfo(locale: string) {
  const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  const weekInfo = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
  const { hourCycle } = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
  }).resolvedOptions();
  return {
    startOfWeek: (weekInfo?.firstDay ?? 1) % 7,
    hourCycle: (hourCycle === 'h11' || hourCycle === 'h12'
      ? 'h12'
      : 'h24') as ClockFormat,
  };
}

export function getWeekdays(
  locale: string,
  startOfWeek: number,
  width: 'long' | 'short' | 'narrow' = 'short',
) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: width });
  return Array.from({ length: 7 }, (_, index) => {
    const value = (startOfWeek + index) % 7;
    return {
      value: String(value),
      label: formatter.format(new Date(2024, 0, 7 + value)),
    };
  });
}

export function getMonthPadding(
  year: number,
  month: number,
  startOfWeek: number,
) {
  return (new Date(year, month, 1).getDay() - startOfWeek + 7) % 7;
}

const numericDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  calendar: 'gregory',
  numberingSystem: 'latn',
};

export function getDayjsDateTimeFormat(
  regionalLocale: string,
  hourCycle: ClockFormat,
  meridiem?: string,
) {
  const tokens: Record<string, string> = {
    year: 'YYYY',
    month: 'MM',
    day: 'DD',
  };
  const dateFormat = new Intl.DateTimeFormat(regionalLocale, numericDateOptions)
    .formatToParts(new Date(2026, 8, 14))
    .map((part) => tokens[part.type] ?? `[${part.value}]`)
    .join('');
  const timeFormat =
    hourCycle === 'h12'
      ? ['hh:mm', meridiem ? `[${meridiem}]` : 'A'].join(' ')
      : 'HH:mm';
  return `${dateFormat} ${timeFormat}`;
}

export function createDateFormatters(
  locale: string,
  regionalLocale: string,
  hourCycle: ClockFormat,
  amPmLabels?: { am: string; pm: string },
) {
  const toDate = (date: Date | string) =>
    typeof date === 'string' ? new Date(date) : date;
  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) =>
    toDate(date).toLocaleDateString(
      options ? locale : regionalLocale,
      options ?? numericDateOptions,
    );
  const formatWithTime = (
    date: Date | string,
    options: Intl.DateTimeFormatOptions,
  ) =>
    new Intl.DateTimeFormat(locale, {
      ...options,
      hour12: undefined,
      hourCycle: hourCycle === 'h12' ? 'h12' : 'h23',
    })
      .formatToParts(toDate(date))
      .map((part) => {
        if (part.type === 'dayPeriod' && amPmLabels) {
          const hour = Number(
            new Intl.DateTimeFormat('en', {
              hour: 'numeric',
              hourCycle: 'h23',
              timeZone: options.timeZone,
            }).format(toDate(date)),
          );
          return hour < 12 ? amPmLabels.am : amPmLabels.pm;
        }
        return part.value;
      })
      .join('');
  const formatTime = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) =>
    formatWithTime(date, {
      ...(options ?? { hour: 'numeric', minute: '2-digit' }),
    });
  const formatDateTime = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => {
    if (options) {
      return formatWithTime(date, options);
    }
    return `${formatDate(date)} ${formatTime(date)}`;
  };
  return { formatDate, formatTime, formatDateTime };
}
