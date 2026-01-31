import { Injectable, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Logger } from '@postybirb/logger';
import { UPDATE_UPDATES } from '@postybirb/socket-events';
import { ReleaseNoteInfo, UpdateState } from '@postybirb/types';
import { ProgressInfo, UpdateInfo, autoUpdater } from 'electron-updater';
import { WSGateway } from '../web-socket/web-socket-gateway';

/**
 * Handles updates for the application.
 *
 * @class UpdateService
 */
@Injectable()
export class UpdateService {
  private readonly logger = Logger('Updates');

  private updateState: UpdateState = {
    updateAvailable: false,
    updateDownloaded: false,
    updateDownloading: false,
    updateError: undefined,
    updateProgress: undefined,
    updateNotes: undefined,
  };

  constructor(@Optional() private readonly webSocket?: WSGateway) {
    autoUpdater.logger = this.logger;
    autoUpdater.autoDownload = false;
    autoUpdater.fullChangelog = true;
    autoUpdater.allowPrerelease = true;

    this.registerListeners();
    setTimeout(() => this.checkForUpdates(), 5_000);
  }

  /**
   * Emit update state changes via WebSocket.
   */
  private emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: UPDATE_UPDATES,
        data: this.getUpdateState(),
      });
    }
  }

  private registerListeners() {
    autoUpdater.on('update-available', (update) => {
      this.onUpdateAvailable(update);
    });
    autoUpdater.on('download-progress', (progress) => {
      this.onDownloadProgress(progress);
    });
    autoUpdater.on('error', (error) => {
      this.onUpdateError(error);
    });
    autoUpdater.on('update-downloaded', () => {
      this.onUpdateDownloaded();
    });
  }

  private onUpdateDownloaded() {
    this.updateState = {
      ...this.updateState,
      updateDownloaded: true,
      updateDownloading: false,
      updateProgress: 100,
    };
    this.emit();
  }

  private onUpdateAvailable(update: UpdateInfo) {
    this.updateState = {
      ...this.updateState,
      updateAvailable: true,
      updateNotes: (update.releaseNotes as ReleaseNoteInfo[]) ?? [],
    };
    this.emit();
  }

  private onUpdateError(error: Error) {
    this.logger.withError(error).error();
    this.updateState = {
      ...this.updateState,
      updateError: error.message,
      updateDownloading: false,
    };
    this.emit();
  }

  private onDownloadProgress(progress: ProgressInfo) {
    this.updateState = {
      ...this.updateState,
      updateProgress: progress.percent,
    };
    this.emit();
  }

  @Interval(600_000)
  public checkForUpdates() {
    if (
      this.updateState.updateDownloading ||
      this.updateState.updateDownloaded
    ) {
      return;
    }

    autoUpdater.checkForUpdates();
  }

  public getUpdateState() {
    return { ...this.updateState };
  }

  public update() {
    if (
      !this.updateState.updateAvailable ||
      this.updateState.updateDownloaded ||
      this.updateState.updateDownloading
    ) {
      return;
    }

    this.updateState = {
      ...this.updateState,
      updateDownloading: true,
    };
    this.emit();

    autoUpdater.downloadUpdate();
  }

  /**
   * Quit the application and install the downloaded update.
   * Only works if an update has been downloaded.
   */
  public install() {
    if (!this.updateState.updateDownloaded) {
      return;
    }

    autoUpdater.quitAndInstall(false, true);
  }
}
