import { Logger, trackException } from '@postybirb/logger';
import {
  PostyBirbEnvConfig,
  StartupOptionsManager,
  toError,
} from '@postybirb/utils/common';
import {
  BrowserWindow,
  NativeImage,
  nativeImage,
  nativeTheme,
  screen,
} from 'electron';
import { join } from 'path';
import { environment } from '../../environments/environment';
import {
  MAIN_WINDOW_DEFAULT_HEIGHT,
  MAIN_WINDOW_DEFAULT_WIDTH,
  RENDERER_MAX_RELOADS,
  RENDERER_RELOAD_WINDOW_MS,
  rendererAppPort,
} from '../constants';
import { startupLoader } from './loader';
import { hardenMainWindowWebContents } from './security';

const logger = Logger('MainWindow');
const appIcon = join(__dirname, 'assets/app-icon.png');

/**
 * Owns the lifecycle of the single main application window: creation, focusing,
 * and crash/freeze recovery. The window hosts PostyBirb's trusted UI in a
 * sandboxed, context-isolated renderer.
 */
export class WindowManager {
  private window: BrowserWindow | null = null;

  private readonly appImage: NativeImage = nativeImage.createFromPath(appIcon);

  /** Timestamps of recent recovery reloads, used to throttle reload loops. */
  private rendererReloadTimestamps: number[] = [];

  /** The live main window, or null if it does not exist / was destroyed. */
  getWindow(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null;
  }

  getAppImage(): NativeImage {
    return this.appImage;
  }

  /** Create the main window if needed, otherwise focus the existing one. */
  showOrCreate(): void {
    const existing = this.getWindow();
    if (existing) {
      this.focus(existing);
      return;
    }

    this.window = this.createWindow();
    this.loadContent(this.window);
  }

  /** Bring the window to the foreground, creating it if it no longer exists. */
  show(): void {
    const existing = this.getWindow();
    if (!existing) {
      this.showOrCreate();
      return;
    }

    this.focus(existing);
  }

  private focus(window: BrowserWindow): void {
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
  }

  private createWindow(): BrowserWindow {
    const { workAreaSize } = screen.getPrimaryDisplay();
    const width = Math.min(
      MAIN_WINDOW_DEFAULT_WIDTH,
      workAreaSize.width || MAIN_WINDOW_DEFAULT_WIDTH,
    );
    const height = Math.min(
      MAIN_WINDOW_DEFAULT_HEIGHT,
      workAreaSize.height || MAIN_WINDOW_DEFAULT_HEIGHT,
    );

    const window = new BrowserWindow({
      title: 'PostyBirb',
      darkTheme: nativeTheme.shouldUseDarkColors,
      width,
      height,
      show: false,
      icon: this.appImage,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        preload: join(__dirname, 'preload.js'),
        webviewTag: true,
        spellcheck: StartupOptionsManager.get().spellchecker,
        devTools: true,
      },
    });

    window.setMenu(null);
    window.center();

    hardenMainWindowWebContents(window.webContents);
    this.wireCrashRecovery(window);

    window.once('ready-to-show', () => {
      startupLoader.hide('main-window-ready');
      window.show();
    });

    window.on('closed', () => {
      this.window = null;
    });

    return window;
  }

  private loadContent(window: BrowserWindow): void {
    const url = environment.production
      ? `https://localhost:${PostyBirbEnvConfig.port}`
      : `http://localhost:${rendererAppPort}`;

    window.loadURL(url).catch((error) => {
      logger
        .withError(toError(error))
        .error(`Failed to load main window URL: ${url}`);
    });
  }

  private wireCrashRecovery(window: BrowserWindow): void {
    const { webContents } = window;

    // The renderer process died (crash, OOM, or a lost GPU/graphics context).
    // Without this the window would be left blank/frozen forever; instead we
    // log, track, and attempt an in-place reload to recover the UI.
    webContents.on('render-process-gone', (_event, details) => {
      const message = `Main window renderer gone — reason: ${details.reason}, exitCode: ${details.exitCode}`;
      logger.error(message);
      trackException(new Error(message), {
        source: 'electron-main',
        type: 'renderProcessGone',
        reason: details.reason,
        exitCode: String(details.exitCode),
      });

      // A clean exit is not a crash and needs no recovery.
      if (details.reason !== 'clean-exit') {
        this.recoverRenderer(details.reason);
      }
    });

    // The renderer's JS event loop is blocked. Log so freezes can be told apart
    // from GPU/renderer crashes; recovery requires user input so we do not
    // force a reload here.
    webContents.on('unresponsive', () => {
      logger.warn(
        'Main window became unresponsive (renderer event loop blocked).',
      );
      trackException(new Error('Main window unresponsive'), {
        source: 'electron-main',
        type: 'windowUnresponsive',
      });
    });

    webContents.on('responsive', () => {
      logger.info('Main window became responsive again.');
    });

    // The window failed to load its URL (e.g. after a recovery reload). Ignore
    // user-initiated aborts (errorCode -3).
    webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        if (errorCode === -3) {
          return;
        }
        logger.error(
          `Main window failed to load (${errorCode} ${errorDescription}) for ${validatedURL}.`,
        );
      },
    );
  }

  /**
   * Attempt to recover a window whose renderer or graphics context died.
   * Reloads in place unless we have reloaded too many times recently, in which
   * case the window is left as-is to avoid a crash/reload loop.
   */
  private recoverRenderer(reason: string): void {
    const window = this.getWindow();
    if (!window) {
      return;
    }

    const now = Date.now();
    this.rendererReloadTimestamps = this.rendererReloadTimestamps.filter(
      (ts) => now - ts < RENDERER_RELOAD_WINDOW_MS,
    );

    if (this.rendererReloadTimestamps.length >= RENDERER_MAX_RELOADS) {
      logger.error(
        `Renderer recovery suppressed after ${RENDERER_MAX_RELOADS} reloads within ${RENDERER_RELOAD_WINDOW_MS}ms (reason: ${reason}); leaving window as-is to avoid a reload loop.`,
      );
      return;
    }

    this.rendererReloadTimestamps.push(now);
    logger.warn(
      `Reloading main window to recover renderer (reason: ${reason}).`,
    );
    try {
      window.webContents.reload();
    } catch (error) {
      logger
        .withError(toError(error))
        .error('Failed to reload main window during renderer recovery.');
    }
  }
}
