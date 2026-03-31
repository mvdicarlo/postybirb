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

export const calendarLanguageMap: Record<string, string> = {
  'pt-BR': 'pt-br',
  en: 'en-US',
  de: 'de-DE',
  lt: 'lt-LT',
  ru: 'ru-RU',
  es: 'pt-BR',
  ta: 'ta-IN',
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
