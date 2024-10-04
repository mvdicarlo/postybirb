import { msg } from '@lingui/macro';
import 'dayjs/locale/es';
import 'dayjs/locale/ru';

export const languages = [
  [msg`English`, 'en'],
  [msg`Russian`, 'ru'],
  [msg`Spanish`, 'es'],
] as const;
