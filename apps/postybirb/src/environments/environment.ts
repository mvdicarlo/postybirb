import { environment as baseEnvironment } from './environment.base';

/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
declare const __BUILD_VERSION__: string;

export const environment = {
  ...baseEnvironment,
  production: false,
  version: __BUILD_VERSION__,
};
