import { Injectable } from '@nestjs/common';
import {
  PlatformNotificationOptions,
  PlatformNotificationService,
} from '@postybirb/platform';
import { Notification as ElectronNotification } from 'electron';

/**
 * Electron-backed implementation of {@link PlatformNotificationService}.
 *
 * Falls back to a no-op when the Electron Notification API reports the
 * runtime cannot display notifications (e.g. headless / unsupported OS).
 */
@Injectable()
export class ElectronNotificationService extends PlatformNotificationService {
  isSupported(): boolean {
    return ElectronNotification.isSupported();
  }

  show(options: PlatformNotificationOptions): void {
    if (!this.isSupported()) {
      return;
    }
    new ElectronNotification({
      title: options.title,
      body: options.body,
      silent: options.silent,
    }).show();
  }
}
