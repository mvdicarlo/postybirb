import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'ru', 'es', 'de', 'lt', 'ta', 'pt_BR'],
  formatOptions: { lineNumbers: false },
  catalogs: [
    {
      include: ['apps/postybirb-ui/src/', 'libs/translations/src/'],
      path: 'lang/{locale}',
    },
  ],
};

export default config;
