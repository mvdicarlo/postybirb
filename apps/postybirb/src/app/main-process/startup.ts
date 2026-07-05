import { INestApplication } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { flushAppInsights, Logger, trackException } from '@postybirb/logger';
import {
  PostyBirbEnvConfig,
  RemoteConfigManager,
  toError,
} from '@postybirb/utils/common';
import { app } from 'electron';
import { environment } from '../../environments/environment';
import { startupLoader } from './loader';

const logger = Logger('Startup');

/** Hard ceiling on how long the client-server bootstrap may take. */
const BOOTSTRAP_TIMEOUT_MS = 180_000;

let isQuittingDueToStartupFailure = false;

/**
 * Inject runtime metadata into the environment so the client-server bootstrap
 * (and other process-level consumers) can read it. Must run before the
 * client-server is bootstrapped.
 */
export function injectProcessEnvironment(): void {
  process.env.POSTYBIRB_PORT = PostyBirbEnvConfig.port;
  process.env.POSTYBIRB_VERSION = environment.version;
  process.env.POSTYBIRB_ENV =
    (process.env.POSTYBIRB_ENV ?? environment.production)
      ? 'production'
      : 'development';
}

/** Print a human-readable startup banner with key runtime configuration. */
export function logStartupBanner(): void {
  const remoteConfig = RemoteConfigManager.getSync();
  const entries: [string, string][] = [
    ['Version', environment.version],
    ['Mode', process.env.POSTYBIRB_ENV ?? ''],
    ['Port', String(PostyBirbEnvConfig.port)],
    ['Storage', PostyBirbDirectories.POSTYBIRB_DIRECTORY],
    ['App Data', app.getPath('userData')],
    ['===== Remote Config =====', ''],
    ['Remote Enabled', String(remoteConfig?.enabled)],
    [
      'Remote Password',
      remoteConfig?.enabled ? (remoteConfig?.password ?? '') : '',
    ],
  ];
  const labelWidth = Math.max(...entries.map(([k]) => k.length));
  const valueWidth = Math.max(...entries.map(([, v]) => v.length));
  // "║  Label : Value  ║" → 2 + labelWidth + 3 + valueWidth + 2
  const innerWidth = 2 + labelWidth + 3 + valueWidth + 2;
  const title = 'PostyBirb';
  const titlePad = Math.max(innerWidth, title.length + 4);
  const w = Math.max(innerWidth, titlePad);
  const titleLine = title
    .padStart(Math.floor((w + title.length) / 2))
    .padEnd(w);

  const lines = entries.map(
    ([k, v]) => `║  ${k.padEnd(labelWidth)} : ${v.padEnd(valueWidth)}  ║`,
  );

  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      `╔${'═'.repeat(w)}╗`,
      `║${titleLine}║`,
      `╠${'═'.repeat(w)}╣`,
      ...lines,
      `╚${'═'.repeat(w)}╝`,
      '',
    ].join('\n'),
  );
}

/**
 * Bootstrap the embedded client-server, failing fast if it hangs. A hung
 * bootstrap would otherwise leave the user staring at the splash screen
 * forever; the timeout lets {@link quitOnStartupFailure} take over.
 */
export function bootstrapWithTimeout(
  factory: () => Promise<INestApplication>,
): Promise<INestApplication> {
  return Promise.race([
    factory(),
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Timed out bootstrapping client server after ${BOOTSTRAP_TIMEOUT_MS}ms.`,
          ),
        );
      }, BOOTSTRAP_TIMEOUT_MS);
      timer.unref();
    }),
  ]);
}

/**
 * Handle a fatal startup failure: report it, hide the splash, and quit. A
 * force-exit timer guards against a hung shutdown.
 */
export function quitOnStartupFailure(error: unknown): void {
  if (isQuittingDueToStartupFailure) {
    return;
  }
  isQuittingDueToStartupFailure = true;

  const startupError = toError(error);
  logger.withError(startupError).error('Fatal startup failure. Quitting app.');
  trackException(startupError, {
    source: 'electron-main',
    type: 'startupFailure',
  });

  startupLoader.hide('startup-failure');

  const forceExitTimer = setTimeout(() => {
    app.exit(1);
  }, 5_000);
  forceExitTimer.unref();

  flushAppInsights().finally(() => {
    app.quit();
  });
}
