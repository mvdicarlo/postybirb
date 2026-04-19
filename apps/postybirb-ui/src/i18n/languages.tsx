import { msg } from '@lingui/core/macro';

import 'cronstrue/locales/de';
import 'cronstrue/locales/es';
import 'cronstrue/locales/pt_BR';
import 'cronstrue/locales/ru';

import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/lt';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/ta';

import calendarDE from '@fullcalendar/core/locales/de';
import calendarES from '@fullcalendar/core/locales/es';
import calendarLT from '@fullcalendar/core/locales/lt';
import calendarPT_BR from '@fullcalendar/core/locales/pt-br';
import calendarRU from '@fullcalendar/core/locales/ru';
import calendarTA from '@fullcalendar/core/locales/ta-in';

export const languages = [
  [msg`English`, 'en'],
  [msg`German`, 'de'],
  [msg`Lithuanian`, 'lt'],
  [msg`Portuguese (Brazil)`, 'pt-BR'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
  [msg`Tamil`, 'ta'],
] as const;

export const supportedLocaleCodes = languages.map(([, code]) => code);

export const dateLocaleMap: Record<string, string> = {
  en: 'en',
  de: 'de',
  lt: 'lt',
  'pt-BR': 'pt-br',
  ru: 'ru',
  es: 'es',
  ta: 'ta',
};

export const calendarLanguageMap: Record<string, string | object> = {
  'pt-BR': calendarPT_BR,
  en: 'en-US',
  de: calendarDE,
  lt: calendarLT,
  ru: calendarRU,
  es: calendarES,
  ta: calendarTA,
};

/**
 * Map app locales to cronstrue locales.
 * Unsupported locales (lt, ta) fall back to English.
 * @see https://github.com/bradymholt/cronstrue#supported-locales
 */
export const cronstrueLocaleMap: Record<string, string> = {
  en: 'en',
  de: 'de',
  lt: 'en', // Lithuanian not supported, fallback to English
  'pt-BR': 'pt_BR',
  ru: 'ru',
  es: 'es',
  ta: 'en', // Tamil not supported, fallback to English
};
