import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'ru', 'es'],
  catalogs: [
    {
      include: ['apps/postybirb-ui/src'],
      path: 'lang/{locale}',
    },
  ],
};

export default config;