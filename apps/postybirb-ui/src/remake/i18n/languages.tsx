import { de, en, es, ru } from '@blocknote/core/locales';
import { msg } from '@lingui/core/macro';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blockNoteLocaleLanguageMap: Record<string, any> = {
  'pt-BR': es,
  en,
  de,
  lt: en,
  ru,
  es,
  ta: en,
};
