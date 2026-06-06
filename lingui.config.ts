import type { LinguiConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';

const config: LinguiConfig = {
  locales: ['en', 'ru', 'es', 'de', 'lt', 'ta', 'pt-BR'],
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      include: ['apps/postybirb-ui/src/', 'libs/translations/src/'],
      path: 'lang/{locale}',
    },
  ],
  fallbackLocales: { default: 'en' },
};

export default config;
