import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DIRECTORY_WATCHER_UPDATES } from '@postybirb/socket-events';
import {
  DirectoryWatcherImportAction,
  EntityId,
  SubmissionType,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { mkdir, readdir, rename, writeFile } from 'fs/promises';
import { getType } from 'mime';
import { join } from 'path';
import { PostyBirbService } from '../common/service/postybirb-service';
import { DirectoryWatcher } from '../drizzle/models';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmissionService } from '../submission/services/submission.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

/**
 * Directory structure for file processing:
 *
 * {watch-path}/        <- Users drop files here
 *   ├── processing/    <- Files being actively processed
 *   ├── completed/     <- Successfully processed files
 *   └── failed/        <- Files that failed processing (with .error.txt)
 */

/**
 * A directory watcher service that reads created watchers and checks
 * for new files added to the folder.
 *
 * Files are moved through different folders based on processing status,
 * eliminating the need for metadata tracking.
 *
 * @class DirectoryWatchersService
 * @extends {PostyBirbService<DirectoryWatcher>}
 */
/**
 * Threshold for warning users about folders with many files.
 * If a folder contains more than this number of files, a confirmation will be required.
 */
export const FILE_COUNT_WARNING_THRESHOLD = 10;

/**
 * Result of checking a directory path for file watcher usage.
 */
export interface CheckPathResult {
  /** Whether the path is valid and accessible */
  valid: boolean;
  /** Number of files in the directory (excluding subfolders) */
  count: number;
  /** List of file names in the directory */
  files: string[];
  /** Error message if the path is invalid */
  error?: string;
}

@Injectable()
export class DirectoryWatchersService extends PostyBirbService<'DirectoryWatcherSchema'> {
  private runningWatchers = new Set<EntityId>();

  private recoveredWatchers = new Set<EntityId>();

  private readonly SUBFOLDER_PROCESSING = 'processing';

  private readonly SUBFOLDER_COMPLETED = 'completed';

  private readonly SUBFOLDER_FAILED = 'failed';

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly notificationService: NotificationsService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('DirectoryWatcherSchema', webSocket);
    this.repository.subscribe('DirectoryWatcherSchema', () =>
      this.emitUpdates(),
    );
  }

  protected async emitUpdates() {
    super.emit({
      event: DIRECTORY_WATCHER_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }

  /**
   * CRON run read of paths.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async run() {
    if (!IsTestEnvironment()) {
      const entities = await this.repository.findAll();
      entities
        .filter((e) => !!e.path)
        .forEach((e) => {
          // Recover orphaned files on first run
          if (!this.recoveredWatchers.has(e.id)) {
            this.recoverOrphanedFiles(e);
            this.recoveredWatchers.add(e.id);
          }

          // Process new files if not already running
          if (!this.runningWatchers.has(e.id)) {
            this.runningWatchers.add(e.id);
            this.read(e).finally(() => this.runningWatchers.delete(e.id));
          }
        });
    }
  }

  /**
   * Ensures all required subdirectories exist.
   *
   * @param {string} basePath
   */
  private async ensureDirectoryStructure(basePath: string): Promise<void> {
    const subfolders = [
      this.SUBFOLDER_PROCESSING,
      this.SUBFOLDER_COMPLETED,
      this.SUBFOLDER_FAILED,
    ];

    for (const folder of subfolders) {
      await mkdir(join(basePath, folder), { recursive: true });
    }
  }

  /**
   * Recovers files that were left in the processing folder due to app crash/restart.
   * Moves them back to the main watch folder for reprocessing.
   *
   * @param {DirectoryWatcher} watcher
   */
  private async recoverOrphanedFiles(watcher: DirectoryWatcher): Promise<void> {
    try {
      await this.ensureDirectoryStructure(watcher.path);

      const processingPath = join(watcher.path, this.SUBFOLDER_PROCESSING);
      const orphanedFiles = await readdir(processingPath);

      if (orphanedFiles.length > 0) {
        this.logger.info(
          `Recovering ${orphanedFiles.length} orphaned files in ${watcher.path}`,
        );

        for (const file of orphanedFiles) {
          const sourcePath = join(processingPath, file);
          const targetPath = join(watcher.path, file);

          try {
            await rename(sourcePath, targetPath);
            this.logger.info(`Recovered orphaned file: ${file}`);
          } catch (err) {
            this.logger.error(err, `Failed to recover orphaned file: ${file}`);
          }
        }

        this.notificationService.create({
          title: 'Directory Watcher Recovery',
          message: `Recovered ${orphanedFiles.length} orphaned files in '${watcher.path}'`,
          type: 'info',
          tags: ['directory-watcher', 'recovery'],
          data: {
            recoveredFiles: orphanedFiles,
            watcherId: watcher.id,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        err,
        `Failed to recover orphaned files for watcher ${watcher.id}`,
      );
    }
  }

  /**
   * Reads directory for processable files.
   *
   * @param {DirectoryWatcher} watcher
   */
  private async read(watcher: DirectoryWatcher) {
    try {
      // Ensure directory structure exists
      await this.ensureDirectoryStructure(watcher.path);

      const allFiles = await readdir(watcher.path);
      const filesInDirectory = allFiles.filter(
        (file) =>
          file !== this.SUBFOLDER_PROCESSING &&
          file !== this.SUBFOLDER_COMPLETED &&
          file !== this.SUBFOLDER_FAILED,
      );

      // Only process and notify if there are files
      if (filesInDirectory.length === 0) {
        return;
      }

      const results = { success: [], failed: [] };

      // Process files sequentially
      for (const file of filesInDirectory) {
        try {
          await this.processFileWithMove(watcher, file);
          results.success.push(file);
        } catch (err) {
          this.logger.error(err, `Failed to process file ${file}`);
          results.failed.push({ file, error: err.message });
        }
      }

      // Create notification with success/failure breakdown
      this.notificationService.create({
        title: 'Directory Watcher',
        message: `Processed ${results.success.length} of ${filesInDirectory.length} files in '${watcher.path}'`,
        type: results.failed.length > 0 ? 'warning' : 'info',
        tags: ['directory-watcher'],
        data: {
          successCount: results.success.length,
          failedCount: results.failed.length,
          successFiles: results.success,
          failedFiles: results.failed,
          watcherId: watcher.id,
        },
      });
    } catch (e) {
      this.logger.error(e, `Failed to read directory ${watcher.path}`);
      this.notificationService.create({
        title: 'Directory Watcher Error',
        message: `Failed to read directory ${watcher.path}`,
        type: 'error',
        tags: ['directory-watcher'],
        data: {
          error: e.message,
        },
      });
    }
  }

  /**
   * Processes a file using the move/archive pattern.
   * Files are moved through: main folder -> processing -> completed/failed
   *
   * @param {DirectoryWatcher} watcher
   * @param {string} fileName
   */
  private async processFileWithMove(
    watcher: DirectoryWatcher,
    fileName: string,
  ): Promise<void> {
    const sourcePath = join(watcher.path, fileName);
    const processingPath = join(
      watcher.path,
      this.SUBFOLDER_PROCESSING,
      fileName,
    );
    const completedPath = join(
      watcher.path,
      this.SUBFOLDER_COMPLETED,
      fileName,
    );
    const failedPath = join(watcher.path, this.SUBFOLDER_FAILED, fileName);

    let currentLocation = sourcePath;
    let submissionId: EntityId | null = null;

    try {
      // Step 1: Move to processing folder (atomic operation)
      await rename(sourcePath, processingPath);
      currentLocation = processingPath;
      this.logger.info(`Processing file ${fileName}`);

      // Step 2: Process the file
      const multerInfo: MulterFileInfo = {
        fieldname: '',
        origin: 'directory-watcher',
        originalname: fileName,
        encoding: '',
        mimetype: getType(fileName),
        size: 0,
        destination: '',
        filename: fileName,
        path: processingPath, // Use processing path
      };

      switch (watcher.importAction) {
        case DirectoryWatcherImportAction.NEW_SUBMISSION: {
          const submission = await this.submissionService.create(
            {
              name: fileName,
              type: SubmissionType.FILE,
            },
            multerInfo,
          );
          submissionId = submission.id;

          if (watcher.template) {
            await this.submissionService.applyOverridingTemplate(
              submission.id,
              watcher.template?.id,
            );
          }
          break;
        }

        default:
          break;
      }

      // Step 3: Move to completed folder
      await rename(processingPath, completedPath);
      this.logger.info(
        `Successfully processed file ${fileName} (submission: ${submissionId})`,
      );
    } catch (err) {
      this.logger.error(err, `Failed to process file ${fileName}`);

      // Cleanup submission if it was created
      if (submissionId) {
        await this.submissionService
          .remove(submissionId)
          .catch((cleanupErr) => {
            this.logger.error(
              cleanupErr,
              `Failed to cleanup submission ${submissionId}`,
            );
          });
      }

      // Move to failed folder and create error file
      try {
        await rename(currentLocation, failedPath);

        // Create error details file
        const errorFilePath = join(
          watcher.path,
          this.SUBFOLDER_FAILED,
          `${fileName}.error.txt`,
        );
        const errorDetails = [
          `File: ${fileName}`,
          `Failed at: ${new Date().toISOString()}`,
          `Error: ${err.message}`,
          `Stack: ${err.stack || 'N/A'}`,
        ].join('\n');

        await writeFile(errorFilePath, errorDetails);
      } catch (moveErr) {
        this.logger.error(
          moveErr,
          `Failed to move file to failed folder: ${fileName}`,
        );
      }

      throw err;
    }
  }

  async create(
    createDto: CreateDirectoryWatcherDto,
  ): Promise<DirectoryWatcher> {
    // Validate path exists and is accessible (only if path is provided)
    if (createDto.path) {
      try {
        await readdir(createDto.path);
      } catch (err) {
        throw new BadRequestException(
          `Path '${createDto.path}' does not exist or is not accessible`,
        );
      }

      // Create directory structure
      await this.ensureDirectoryStructure(createDto.path);
    }

    return this.repository.insert(createDto);
  }

  async update(id: EntityId, update: UpdateDirectoryWatcherDto) {
    this.logger.withMetadata(update).info(`Updating DirectoryWatcher '${id}'`);
    const entity = await this.repository.findById(id, { failOnMissing: true });

    // Validate path if being updated
    if (update.path && update.path !== entity.path) {
      try {
        await readdir(update.path);
      } catch (err) {
        throw new BadRequestException(
          `Path '${update.path}' does not exist or is not accessible`,
        );
      }

      // Create directory structure for new path
      await this.ensureDirectoryStructure(update.path);
    }

    const template = update.templateId
      ? await this.submissionService.findById(update.templateId, {
          failOnMissing: true,
        })
      : null;
    if (template && !template.isTemplate) {
      throw new BadRequestException('Template Id provided is not a template.');
    }

    const updatedEntity = await this.repository.update(id, {
      importAction: update.importAction ?? entity.importAction,
      path: update.path ?? entity.path,
      templateId: update.templateId ?? entity.templateId,
    });

    // If this is the first time setting a path (from null/empty to valid path), ensure directory structure
    if (!entity.path && updatedEntity.path) {
      await this.ensureDirectoryStructure(updatedEntity.path);
    }

    return updatedEntity;
  }

  /**
   * Checks a directory path for validity and returns file count information.
   * Used to warn users before selecting folders with many files.
   *
   * @param {string} path - The directory path to check
   * @returns {Promise<CheckPathResult>} Information about the directory
   */
  async checkPath(path: string): Promise<CheckPathResult> {
    try {
      const allFiles = await readdir(path);
      const files = allFiles.filter(
        (file) =>
          file !== this.SUBFOLDER_PROCESSING &&
          file !== this.SUBFOLDER_COMPLETED &&
          file !== this.SUBFOLDER_FAILED,
      );

      return {
        valid: true,
        count: files.length,
        files,
      };
    } catch (err) {
      return {
        valid: false,
        count: 0,
        files: [],
        error: `Path '${path}' does not exist or is not accessible`,
      };
    }
  }
}
