import {
    isLinux,
    isOSX,
    StartupOptions,
    StartupOptionsManager,
} from '@postybirb/utils/common';
import { app, Menu, NativeImage, Tray } from 'electron';

/**
 * Owns the system tray icon and its menu, and keeps the OS "launch on startup"
 * setting in sync with PostyBirb's startup options.
 */
export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly image: NativeImage,
    private readonly onOpen: () => void,
    private readonly onQuit: () => void,
  ) {}

  /** Create the tray (idempotent) and sync the OS login-item setting. */
  init(): void {
    if (this.tray) {
      return;
    }

    const image = isOSX()
      ? this.image.resize({ width: 16, height: 16 })
      : this.image;

    const tray = new Tray(image);
    tray.setContextMenu(this.buildMenu());
    tray.setToolTip('PostyBirb');
    tray.on('click', () => this.onOpen());

    StartupOptionsManager.onUpdate(this.handleStartupOptionsUpdate);
    this.tray = tray;

    this.syncLoginItemSettings(StartupOptionsManager.get());
  }

  private buildMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: 'Open',
        click: () => this.onOpen(),
      },
      {
        enabled: !isLinux(),
        label: 'Launch on Startup',
        type: 'checkbox',
        checked: StartupOptionsManager.get().startAppOnSystemStartup,
        click: (event) => {
          StartupOptionsManager.set({ startAppOnSystemStartup: event.checked });
        },
      },
      {
        label: 'Quit',
        click: () => this.onQuit(),
      },
    ]);
  }

  private handleStartupOptionsUpdate = (opts: StartupOptions): void => {
    this.syncLoginItemSettings(opts);
    this.refreshMenu();
  };

  private syncLoginItemSettings(opts: StartupOptions): void {
    if (isLinux()) {
      return;
    }

    app.setLoginItemSettings({
      openAtLogin: opts.startAppOnSystemStartup,
      path: app.getPath('exe'),
    });
  }

  private refreshMenu(): void {
    if (this.tray) {
      this.tray.setContextMenu(this.buildMenu());
    }
  }
}
