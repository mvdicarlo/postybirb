import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Logger } from '@postybirb/logger';
import { ProgressInfo, UpdateInfo, autoUpdater } from 'electron-updater';
import winston from 'winston';

type UpdateState = {
  updateAvailable?: boolean;
  updateDownloaded?: boolean;
  updateDownloading?: boolean;
  updateError?: string;
  updateProgress?: number;
  updateNotes?: string;
};

/**
 * Handles updates for the application.
 *
 * @class UpdateService
 */
@Injectable()
export class UpdateService {
  private readonly logger = Logger();

  private updateState: UpdateState = {
    updateAvailable: false,
    updateDownloaded: false,
    updateDownloading: false,
    updateError: undefined,
    updateProgress: undefined,
    updateNotes: undefined,
  };

  constructor() {
    autoUpdater.logger = winston.createLogger({
      transports: [new winston.transports.Console()],
    });
    autoUpdater.autoDownload = false;
    autoUpdater.fullChangelog = true;
    autoUpdater.allowPrerelease = true;

    this.registerListeners();

    setTimeout(() => this.checkForUpdates(), 10_000);
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
      updateProgress: 100,
    };

    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 1000);
  }

  private onUpdateAvailable(update: UpdateInfo) {
    this.updateState = {
      ...this.updateState,
      updateAvailable: true,
      updateNotes: Array.isArray(update.releaseNotes)
        ? update.releaseNotes.join('\n\n')
        : update.releaseNotes,
    };
  }

  private onUpdateError(error: Error) {
    this.logger.withError(error).error();
    this.updateState = {
      ...this.updateState,
      updateError: error.message,
    };
  }

  private onDownloadProgress(progress: ProgressInfo) {
    this.updateState = {
      ...this.updateState,
      updateProgress: progress.percent,
    };
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
    if (!this.updateState.updateAvailable) {
      return;
    }

    this.updateState = {
      ...this.updateState,
      updateDownloading: true,
    };

    autoUpdater.downloadUpdate();
  }
}
