// MUST run before any module that depends on configured electron paths
// (e.g. @postybirb/fs evaluates StartupOptionsManager.get() at module load).
import './bootstrap-electron-config';

// Ensure proxy is imported first to patch fetch before any request is made.
import { onSessionCreated } from '@postybirb/http';

import { INestApplication } from '@nestjs/common';
import { initializeAppInsights } from '@postybirb/logger';
import {
  PostyBirbEnvConfig,
  validateEnvConfigOrExit,
} from '@postybirb/utils/common';
import { app, crashReporter } from 'electron';
import contextMenu from 'electron-context-menu';
import PostyBirbApp from './app/app';
import { APP_USER_MODEL_ID } from './app/constants';
import { bootstrapElectronEvents } from './app/events/electron.events';
import {
  registerChildProcessDiagnostics,
  registerPowerDiagnostics,
  registerProcessErrorHandlers,
} from './app/main-process/diagnostics';
import { startupLoader } from './app/main-process/loader';
import {
  bootstrapWithTimeout,
  injectProcessEnvironment,
  logStartupBanner,
  quitOnStartupFailure,
} from './app/main-process/startup';
import { environment } from './environments/environment';

// Handle --help and validate --port before anything else runs.
validateEnvConfigOrExit({
  version: app.getVersion() || '4.0.2',
  onValidationFailed: () => app.quit(),
});

crashReporter.start({
  productName: 'PostyBirb',
  companyName: 'PostyBirb',
  uploadToServer: false,
});

// Enforce a single running instance; subsequent launches are funneled to the
// existing window by the 'second-instance' handler in PostyBirbApp.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit();
}

app.setAppUserModelId(APP_USER_MODEL_ID);

app.on('session-created', (createdSession) => {
  onSessionCreated(createdSession).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[PostyBirb] Failed to apply proxy to new session', error);
  });
});

// Keep the renderer and its timers running in the background so long-running
// post queues do not stall when the window is hidden.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

injectProcessEnvironment();
logStartupBanner();

initializeAppInsights({
  enabled: true,
  appVersion: environment.version,
});

// Register diagnostics as early as possible so failures during bootstrap (and
// early GPU/child-process crashes) are captured.
registerProcessErrorHandlers();
registerChildProcessDiagnostics();

async function bootstrapClientServer(): Promise<INestApplication> {
  const { bootstrapClientServer: bootstrap } =
    // eslint-disable-next-line @nx/enforce-module-boundaries
    await import('apps/client-server/src/main');
  return bootstrap({ userDataPath: app.getPath('userData') });
}

async function start(): Promise<void> {
  try {
    const nestApp = await bootstrapWithTimeout(bootstrapClientServer);

    if (PostyBirbEnvConfig.headless) {
      // eslint-disable-next-line no-console
      console.log('[PostyBirb] Running in headless mode (no UI)');
      return;
    }

    // Register IPC handlers BEFORE creating the window so the sandboxed preload
    // can synchronously read app metadata as it loads.
    bootstrapElectronEvents();

    const postyBirb = new PostyBirbApp(nestApp);
    postyBirb.start();
  } catch (error) {
    quitOnStartupFailure(error);
  }
}

app
  .whenReady()
  .then(() => {
    if (!PostyBirbEnvConfig.headless) {
      startupLoader.show();
    }

    registerPowerDiagnostics();
    contextMenu();
    return start();
  })
  .catch((error) => {
    quitOnStartupFailure(error);
  });

app.on('before-quit', () => {
  startupLoader.hide('before-quit');
});
