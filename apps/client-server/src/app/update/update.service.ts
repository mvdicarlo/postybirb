import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Logger } from '@postybirb/logger';
import { ProgressInfo, UpdateInfo, autoUpdater } from 'electron-updater';
import winston from 'winston';
import * as os from 'os';

interface ReleaseNoteInfo {
  /**
   * The version.
   */
  readonly version: string;
  /**
   * The note.
   */
  readonly note: string | null;
}

export type UpdateState = {
  updateAvailable?: boolean;
  updateDownloaded?: boolean;
  updateDownloading?: boolean;
  updateError?: string;
  updateProgress?: number;
  updateNotes?: ReleaseNoteInfo[];
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

    this.configureLinuxUpdates();
    this.registerListeners();
    setTimeout(() => this.checkForUpdates(), 5_000);
  }

  /**
   * Configure update behavior for Linux based on installation method
   */
  private configureLinuxUpdates() {
    if (os.platform() !== 'linux') {
      return;
    }

    const installationType = this.detectLinuxInstallationType();
    const arch = process.arch === 'x64' ? 'x64' : 'arm64';
    
    this.logger.debug(`Linux installation detected: ${installationType} ${arch}`);
    
    if (installationType !== 'AppImage') {
      // For non-AppImage installations, configure a custom updater
      // that will look for format-specific update files
      const updateFileName = `latest-linux-${installationType}-${arch}.yml`;
      
      this.logger.debug(`Configuring custom update feed for ${updateFileName}`);
      
      // Configure autoUpdater to use the generic provider pointing to our specific update file
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: `https://github.com/mvdicarlo/postybirb/releases/latest/download/${updateFileName}`,
        useMultipleRangeRequest: false,
      });
    } else {
      // For AppImage, use default GitHub provider (will use latest-linux.yml)
      this.logger.debug('Using default GitHub provider for AppImage updates');
    }
  }

  /**
   * Detect how the application was installed on Linux
   */
  private detectLinuxInstallationType(): string {
    // Check for AppImage
    if (process.env.APPIMAGE) {
      return 'AppImage';
    }
    
    // Check for Snap
    if (process.env.SNAP) {
      return 'snap';
    }
    
    // Check installation path to determine package type
    const execPath = process.execPath;
    
    // Check for typical deb installation paths
    if (execPath.includes('/usr/bin/') || execPath.includes('/usr/local/bin/')) {
      return 'deb';
    }
    
    // Check for /opt installation (common for rpm packages)
    if (execPath.includes('/opt/')) {
      return 'rpm';
    }
    
    // Default to tar for portable installations
    return 'tar';
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
      autoUpdater.quitAndInstall(false, true);
    }, 1000);
  }

  private onUpdateAvailable(update: UpdateInfo) {
    this.updateState = {
      ...this.updateState,
      updateAvailable: true,
      updateNotes: (update.releaseNotes as ReleaseNoteInfo[]) ?? [],
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

    autoUpdater.downloadUpdate();
  }
}
