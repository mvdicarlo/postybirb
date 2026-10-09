import { Logger } from '@postybirb/logger';
import { PostyBirbEnvConfig, toError } from '@postybirb/utils/common';

/**
 * Safe wrapper around the splash/loader window module. The underlying
 * implementation lives in {@link ../loader/loader} (a CommonJS module so it can
 * run before the bundle is fully initialised). This controller:
 *
 *  - never throws to its callers (loader failures must not crash startup),
 *  - is a no-op in headless mode (there is no UI to show), and
 *  - lazily resolves the module exactly once.
 */
const logger = Logger('StartupLoader');

type LoaderModule = {
  show: () => void;
  hide: () => void;
};

let cachedModule: LoaderModule | null = null;
let hasResolved = false;

function resolveLoader(): LoaderModule | null {
  if (PostyBirbEnvConfig.headless) {
    return null;
  }

  if (hasResolved) {
    return cachedModule;
  }

  hasResolved = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    cachedModule = require('../loader/loader');
  } catch (error) {
    logger
      .withError(toError(error))
      .warn('Failed to load startup loader module.');
    cachedModule = null;
  }

  return cachedModule;
}

export const startupLoader = {
  show(): void {
    const loader = resolveLoader();
    if (!loader) {
      return;
    }

    try {
      loader.show();
    } catch (error) {
      logger
        .withError(toError(error))
        .warn('Failed to show startup loader window.');
    }
  },

  hide(reason = 'unspecified'): void {
    const loader = resolveLoader();
    if (!loader) {
      return;
    }

    try {
      loader.hide();
    } catch (error) {
      logger
        .withError(toError(error))
        .warn(`Failed to hide startup loader window (${reason}).`);
    }
  },
};
