import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'ru'],
  catalogs: [
    {
      path: 'apps/postybirb-ui/src/lang/{locale}',
      include: ['apps/postybirb-ui/src'],
    },
  ],
};

export default config;
