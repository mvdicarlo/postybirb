import { msg } from '@lingui/core/macro';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/lt';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';

export const languages = [
  [msg`English`, 'en'],
  [msg`German`, 'de'],
  [msg`Lithuanian`, 'lt'],
  [msg`Portuguese (Brazil)`, 'pt-BR'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
] as const;

export const supportedLocaleCodes = languages.map(([, code]) => code);

export const dateLocaleMap: Record<string, string> = {
  en: 'en',
  de: 'de',
  lt: 'lt',
  'pt-BR': 'pt-br',
  ru: 'ru',
  es: 'es',
};

export const calendarLanguageMap: Record<string, string> = {
  'pt-BR': 'pt-br',
  en: 'en',
  de: 'de',
  lt: 'lt',
  ru: 'ru',
  es: 'es',
};
