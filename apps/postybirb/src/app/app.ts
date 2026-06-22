import { INestApplication } from '@nestjs/common';
import { app } from 'electron';
import { installAppSecurity } from './main-process/security';
import { TrayManager } from './main-process/tray';
import { WindowManager } from './main-process/window-manager';

/**
 * Top-level orchestrator for the desktop application. Wires together the window
 * manager, system tray, security policies, and application lifecycle events.
 * Constructed once the embedded client-server has finished bootstrapping.
 */
export default class PostyBirbApp {
  private readonly windowManager = new WindowManager();

  private tray: TrayManager | null = null;

  constructor(private readonly nestApp: INestApplication) {}

  /**
   * Install security policies, create the main window and tray, and register
   * lifecycle handlers. Must be called after the app `ready` event has fired.
   */
  start(): void {
    installAppSecurity();

    this.tray = new TrayManager(
      this.windowManager.getAppImage(),
      () => this.windowManager.show(),
      () => app.quit(),
    );
    this.tray.init();

    this.registerLifecycleEvents();
    this.windowManager.showOrCreate();
  }

  private registerLifecycleEvents(): void {
    // Keep PostyBirb running in the system tray after the last window closes.
    app.on('window-all-closed', () => {});

    // macOS: re-show the window when the dock icon is clicked.
    app.on('activate', () => {
      this.windowManager.show();
    });

    // A second launch should focus the existing window, not spawn a new one.
    app.on('second-instance', () => {
      if (app.isReady()) {
        this.windowManager.show();
      }
    });

    app.on('quit', () => {
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    await this.nestApp.close().catch((error) => {
      // Ignore errors during shutdown
      console.error('Error during shutdown:', error);
    });
    process.exit();
  }
}
