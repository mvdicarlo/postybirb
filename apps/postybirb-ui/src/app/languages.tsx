import { msg } from '@lingui/core/macro';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/lt';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/ta';

export const languages = [
  [msg`Brazil`, 'pt-BR'],
  [msg`English`, 'en'],
  [msg`German`, 'de'],
  [msg`Lithuanian`, 'lt'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
  [msg`Tamil`, 'ta'],
] as const;

export const calendarLanguageMap: Record<string, string> = {
  'pt-BR': 'pt-br',
  en: 'en-US',
  de: 'de-DE',
  lt: 'lt-LT',
  ru: 'ru-RU',
  es: 'pt-BR',
  ta: 'ta-IN',
};
