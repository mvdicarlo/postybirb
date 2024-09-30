import { msg } from '@lingui/macro';
import 'dayjs/locale/es';
import 'dayjs/locale/ru';

export const languages = [
  [msg`English`, 'en'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
] as const;

// Map of the language codes for the file picker
// https://uppy.io/docs/locales/#list-of-locales
export const uppyLocales = {
  en: 'en_US',
  ru: 'ru_RU',
  es: 'es_ES',
} as Record<string, string>;
