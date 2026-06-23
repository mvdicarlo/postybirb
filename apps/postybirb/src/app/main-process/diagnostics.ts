import { flushAppInsights, Logger, trackException } from '@postybirb/logger';
import { toError } from '@postybirb/utils/common';
import { app, powerMonitor } from 'electron';
import { environment } from '../../environments/environment';

/**
 * Main-process observability: surface otherwise-invisible failures and
 * lifecycle events that are useful when diagnosing long-running-session
 * problems (frozen windows, GPU crashes, suspend/resume glitches).
 */
const logger = Logger('Diagnostics');

/** Report otherwise-fatal main-process errors and (in dev) exit. */
export function registerProcessErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.withError(error).error('Uncaught exception in main process.');
    trackException(error, {
      source: 'electron-main',
      type: 'uncaughtException',
    });

    // Give telemetry a chance to flush before exiting (dev only).
    flushAppInsights().then(() => {
      if (!environment.production) {
        process.exit(1);
      }
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = toError(reason);
    logger
      .withError(error)
      .error('Unhandled promise rejection in main process.');
    trackException(error, {
      source: 'electron-main',
      type: 'unhandledRejection',
    });
    flushAppInsights();
  });
}

/**
 * Observe crashes of child processes (GPU, utility, renderer-host, etc.). A GPU
 * process crash is the classic cause of a "graphics context lost" frozen window
 * on long-running sessions; logging it here makes that diagnosable. Electron
 * usually relaunches the GPU process automatically, so this is diagnostic only —
 * renderer recovery is handled per-window by the window manager.
 */
export function registerChildProcessDiagnostics(): void {
  app.on('child-process-gone', (_event, details) => {
    const { type, reason, exitCode, serviceName, name } = details;
    const parts = [
      `type: ${type}`,
      `reason: ${reason}`,
      `exitCode: ${exitCode}`,
    ];
    if (serviceName) {
      parts.push(`service: ${serviceName}`);
    }
    if (name) {
      parts.push(`name: ${name}`);
    }
    const message = `Child process gone — ${parts.join(', ')}`;

    // 'clean-exit' is a normal shutdown of a child (e.g. the sharp worker);
    // only treat abnormal terminations as problems worth tracking.
    if (reason === 'clean-exit') {
      logger.info(message);
      return;
    }

    logger.error(message);
    trackException(new Error(message), {
      source: 'electron-main',
      type: 'childProcessGone',
      childType: type,
      reason,
      exitCode: String(exitCode),
      ...(serviceName ? { serviceName } : {}),
      ...(name ? { childName: name } : {}),
    });
  });
}

/**
 * Log system power transitions. Suspend/resume and screen lock/unlock can
 * coincide with renderer freezes or lost GPU contexts, so recording them helps
 * correlate user-reported freezes with sleep/wake cycles. Requires the app to
 * be ready before it is called.
 */
export function registerPowerDiagnostics(): void {
  powerMonitor.on('suspend', () => logger.info('System power event: suspend.'));
  powerMonitor.on('resume', () => logger.info('System power event: resume.'));
  powerMonitor.on('lock-screen', () =>
    logger.info('System power event: lock-screen.'),
  );
  powerMonitor.on('unlock-screen', () =>
    logger.info('System power event: unlock-screen.'),
  );
}
