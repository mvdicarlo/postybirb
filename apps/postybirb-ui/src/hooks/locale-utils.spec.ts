import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    createDateFormatters,
    getDayjsDateTimeFormat,
    getLocaleInfo,
    getMonthPadding,
    getWeekdays,
    resolveRegionalLocale,
} from './locale-utils';

dayjs.extend(customParseFormat);

describe('regional formatting', () => {
  it.each([
    ['en-US', 0, 'h12'],
    ['en-GB', 1, 'h24'],
    ['ru-RU', 1, 'h24'],
  ])('resolves defaults for %s', (locale, startOfWeek, hourCycle) => {
    expect(getLocaleInfo(String(locale))).toEqual({ startOfWeek, hourCycle });
  });

  it('skips missing or invalid regional locales', () => {
    expect(resolveRegionalLocale(undefined, 'invalid_locale', 'en-GB')).toBe(
      'en-GB',
    );
    expect(resolveRegionalLocale()).toBe('en-GB');
  });

  it.each(Array.from({ length: 7 }, (_, index) => index))(
    'rotates weekdays and month padding for %i',
    (startOfWeek) => {
      const weekdays = getWeekdays('ru', startOfWeek);
      expect(weekdays[0].value).toBe(String(startOfWeek));
      expect(new Set(weekdays.map((day) => day.value)).size).toBe(7);
      expect(weekdays.find((day) => day.value === '1')?.label).toBe('пн');
      expect((startOfWeek + getMonthPadding(2026, 8, startOfWeek)) % 7).toBe(2);
    },
  );

  it.each(['en-US', 'en-GB', 'de-DE', 'sv-SE', 'ru-RU', 'ta-IN'])(
    'round-trips the numeric picker format for %s',
    (regionalLocale) => {
      const date = new Date(2026, 8, 14, 15, 7);
      for (const hourCycle of ['h12', 'h24'] as const) {
        const format = getDayjsDateTimeFormat(regionalLocale, hourCycle);
        const displayed = dayjs(date).format(format);
        expect(dayjs(displayed, format, true).toDate()).toEqual(date);
        expect(displayed).toContain(
          createDateFormatters('en', regionalLocale, hourCycle).formatDate(
            date,
          ),
        );
      }
    },
  );

  it('keeps numeric dates independent of interface language', () => {
    const date = new Date(2026, 8, 14, 15, 7);
    expect(
      createDateFormatters('en', 'en-GB', 'h24').formatDateTime(date),
    ).toBe('14/09/2026 15:07');
    expect(createDateFormatters('ru', 'en-US', 'h24').formatDate(date)).toBe(
      '09/14/2026',
    );
  });

  it('honors clock overrides including midnight and custom options', () => {
    const date = new Date(2026, 8, 14, 0, 7);
    const formatters = createDateFormatters('en-US', 'en-US', 'h24');
    expect(formatters.formatTime(date)).toBe('00:07');
    expect(formatters.formatTime(date, { hour: 'numeric' })).toBe('00');
    expect(formatters.formatTime(date, { hour: 'numeric', hour12: true })).toBe(
      '00',
    );
    expect(
      createDateFormatters('en-GB', 'en-GB', 'h12').formatTime(date),
    ).toMatch(/12:07\s?am/i);
  });

  it('uses translated binary day periods at midnight, noon, and evening', () => {
    const labels = { am: 'before noon', pm: 'after noon' };
    const formatters = createDateFormatters('en', 'en-GB', 'h12', labels);
    for (const hour of [0, 9, 12, 15, 23]) {
      const date = new Date(2026, 8, 14, hour, 7);
      const period = hour < 12 ? labels.am : labels.pm;
      expect(formatters.formatTime(date)).toContain(period);
      expect(
        dayjs(date).format(getDayjsDateTimeFormat('en-GB', 'h12', period)),
      ).toContain(period);
    }
  });

  it('chooses the translated day period in the requested time zone', () => {
    const formatters = createDateFormatters('en', 'en-GB', 'h12', {
      am: 'before noon',
      pm: 'after noon',
    });
    expect(
      formatters.formatDateTime(new Date('2026-09-14T15:07:00Z'), {
        timeZone: 'Asia/Tokyo',
        hour: 'numeric',
        minute: '2-digit',
      }),
    ).toMatch(/12:07\s+before noon/);
  });
});
