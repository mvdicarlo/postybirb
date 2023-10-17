import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { readFile, readdir, writeFile } from 'fs/promises';
import { getType } from 'mime';
import { join } from 'path';
import { PostyBirbService } from '../common/service/postybirb-service';
import { DirectoryWatcher } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { SubmissionService } from '../submission/services/submission.service';
import { IsTestEnvironment } from '../utils/test.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

type WatcherMetadata = {
  read: string[];
};

/**
 * A directory watcher service that reads created watchers and checks
 * for new files added to the folder.
 *
 * If a new file is detected it will attempt to process it.
 *
 * @class DirectoryWatchersService
 * @extends {PostyBirbService<DirectoryWatcher>}
 */
@Injectable()
export class DirectoryWatchersService extends PostyBirbService<DirectoryWatcher> {
  constructor(
    @InjectRepository(DirectoryWatcher)
    repository: PostyBirbRepository<DirectoryWatcher>,
    private readonly submissionService: SubmissionService,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
  }

  /**
   * CRON run read of paths.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async run() {
    if (!IsTestEnvironment()) {
      const entities = await this.repository.findAll();
      entities.filter((e) => !!e.path).forEach((e) => this.read(e));
    }
  }

  /**
   * Reads directory for processable files.
   *
   * @param {DirectoryWatcher} watcher
   */
  private async read(watcher: DirectoryWatcher) {
    const metaFileName = join(watcher.path, 'pb-meta.json');
    try {
      const meta = await this.getMetadata(watcher);
      const filesInDirectory = (await readdir(watcher.path))
        .filter((file) => file !== 'pb-meta.json')
        .filter((file) => !meta.read.includes(file));

      const promises = filesInDirectory.map(async (file) => {
        await this.processFile(watcher, file);
        meta.read.push(file);
      });

      await Promise.allSettled(promises);

      // Update metadata after all is processed
      writeFile(metaFileName, JSON.stringify(meta, null, 1)).catch(
        (err: Error) => {
          this.logger
            .withError(err)
            .error(`Failed to update metadata for '${metaFileName}'`);
        }
      );
    } catch (e) {
      this.logger.error(e, `Failed to read directory ${watcher.path}`);
    }
  }

  /**
   * Gets metadata for directory watcher.
   *
   * @param {DirectoryWatcher} watcher
   * @returns {Promise<WatcherMetadata>}
   */
  private async getMetadata(
    watcher: DirectoryWatcher
  ): Promise<WatcherMetadata> {
    try {
      const metadata = JSON.parse(
        (await readFile(join(watcher.path, 'pb-meta.json'))).toString()
      ) as WatcherMetadata;
      if (!metadata.read) {
        metadata.read = []; // protect user modification
      }
      return metadata;
    } catch {
      return { read: [] };
    }
  }

  /**
   * Attempts to process file and apply action.
   *
   * @param {DirectoryWatcher} watcher
   * @param {string} fileName
   */
  private async processFile(watcher: DirectoryWatcher, fileName: string) {
    const filePath = join(watcher.path, fileName);
    const multerInfo: MulterFileInfo = {
      fieldname: '',
      origin: 'directory-watcher',
      originalname: fileName,
      encoding: '',
      mimetype: getType(fileName),
      size: 0,
      destination: '',
      filename: fileName,
      path: filePath,
    };
    this.logger.info(`Processing file ${filePath}`);
    let submissionId = null;
    try {
      switch (watcher.importAction) {
        case DirectoryWatcherImportAction.NEW_SUBMISSION: {
          const submission = await this.submissionService.create(
            {
              name: fileName,
              type: SubmissionType.FILE,
            },
            multerInfo
          );
          submissionId = submission.id;
          if (watcher.template) {
            await this.submissionService.applyOverridingTemplate(
              submission.id,
              watcher.template?.id
            );
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      this.logger.error(err, `Failed to process file ${filePath}`);
      if (submissionId) {
        await this.submissionService.remove(submissionId);
      }
      throw err;
    }
  }

  async create(
    createDto: CreateDirectoryWatcherDto
  ): Promise<DirectoryWatcher> {
    const entity = this.repository.create(createDto);
    await this.repository.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, update: UpdateDirectoryWatcherDto) {
    this.logger.withMetadata(update).info(`Updating DirectoryWatcher '${id}'`);
    const entity = await this.repository.findById(id, { failOnMissing: true });
    const template = update.template
      ? await this.submissionService.findById(update.template, {
          failOnMissing: true,
        })
      : null;
    if (template && !template.metadata.template) {
      throw new BadRequestException('Template Id provided is not a template.');
    }
    entity.importAction = update.importAction ?? entity.importAction;
    entity.path = update.path ?? entity.path;
    entity.template = template;
    await this.repository.persistAndFlush(entity);
    return entity;
  }
}
