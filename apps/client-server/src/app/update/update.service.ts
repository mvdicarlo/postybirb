import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Logger } from '@postybirb/logger';
import { ProgressInfo, UpdateInfo, autoUpdater } from 'electron-updater';
import winston from 'winston';
import * as os from 'os';
import * as https from 'https';

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
    
    // Use a custom update resolver for Linux that reads the consolidated update file
    // and extracts the appropriate artifact based on installation type
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://github.com/mvdicarlo/postybirb/releases/latest/download/',
      useMultipleRangeRequest: false,
    });
    
    // Override the update info parsing to handle our custom format
    const originalCheckForUpdates = autoUpdater.checkForUpdates.bind(autoUpdater);
    autoUpdater.checkForUpdates = async () => {
      try {
        // Download and parse our custom latest-linux.yml
        const yamlContent = await this.downloadLinuxUpdateFile();
        
        const updateInfo = this.parseCustomLinuxUpdate(yamlContent, installationType, arch);
        if (updateInfo) {
          // Create a standard electron-updater compatible response
          const standardUpdate = {
            version: updateInfo.version,
            releaseDate: updateInfo.releaseDate,
            files: [{
              url: updateInfo.url,
              sha512: updateInfo.sha512,
              size: updateInfo.size
            }],
            path: updateInfo.url,
            sha512: updateInfo.sha512
          };
          
          // Simulate the update-available event with our parsed data
          autoUpdater.emit('update-available', standardUpdate);
          return { updateInfo: standardUpdate, versionInfo: undefined };
        } else {
          this.logger.warn(`No update found for ${installationType} ${arch}`);
          return { updateInfo: null, versionInfo: undefined };
        }
      } catch (error) {
        this.logger.withError(error).error('Failed to check for Linux updates');
        autoUpdater.emit('error', error);
        return { updateInfo: null, versionInfo: undefined };
      }
    };
    
    this.logger.debug('Configured custom Linux update resolver');
  }

  /**
   * Download the Linux update file using https
   */
  private downloadLinuxUpdateFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = 'https://github.com/mvdicarlo/postybirb/releases/latest/download/latest-linux.yml';
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(data);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse our custom Linux update file format
   */
  private parseCustomLinuxUpdate(yamlContent: string, targetType: string, arch: string) {
    const lines = yamlContent.split('\n');
    let currentSection = '';
    let version = '';
    let releaseDate = '';
    let artifacts: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.startsWith('version:')) {
        version = trimmed.split(': ')[1]?.trim() || '';
      } else if (trimmed.startsWith('releaseDate:')) {
        releaseDate = trimmed.split(': ')[1]?.trim() || '';
      } else if (trimmed === 'artifacts:') {
        currentSection = 'artifacts';
      } else if (currentSection === 'artifacts') {
        if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
          // This is a target-arch section like "AppImage-x64:"
          const sectionName = trimmed.slice(0, -1);
          artifacts[sectionName] = {};
          currentSection = sectionName;
        } else if (currentSection in artifacts && trimmed.includes(': ')) {
          const [key, value] = trimmed.split(': ', 2);
          artifacts[currentSection][key] = value.trim();
        }
      }
    }
    
    // Find the artifact for our target type and architecture
    const targetKey = `${targetType}-${arch}`;
    const artifact = artifacts[targetKey];
    
    if (artifact && artifact.url) {
      return {
        version,
        releaseDate,
        url: artifact.url,
        sha512: artifact.sha512,
        size: parseInt(artifact.size, 10)
      };
    }
    
    return null;
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
