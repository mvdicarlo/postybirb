import { msg } from '@lingui/macro';
import 'dayjs/locale/es';
import 'dayjs/locale/ru';

export const languages = [
  [msg`Brazil`, 'pt-BR'],
  [msg`English`, 'en'],
  [msg`German`, 'de'],
  [msg`Lithuanian`, 'lt'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
] as const;
