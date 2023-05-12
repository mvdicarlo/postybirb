import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { rename } from 'fs';
import { readdir } from 'fs/promises';
import { getType } from 'mime';
import { join } from 'path';
import { PostyBirbService } from '../common/service/postybirb-service';
import { DirectoryWatcher } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { SubmissionService } from '../submission/services/submission.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';
import { IsTestEnvironment } from '../utils/test.util';

const PROCESSED_NAME = 'pb_read';

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
   * Reads the directory for files that don't have the PROCESSED_NAME tag.
   *
   * @param {DirectoryWatcher} watcher
   */
  private async read(watcher: DirectoryWatcher) {
    const filesInDirectory = await readdir(watcher.path);
    filesInDirectory
      .filter((file) => !file.startsWith(PROCESSED_NAME))
      .forEach((file) => this.processFile(watcher, file));
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
    switch (watcher.importAction) {
      case DirectoryWatcherImportAction.NEW_SUBMISSION:
        await this.submissionService.create(
          {
            name: fileName,
            type: SubmissionType.FILE,
          },
          multerInfo
        );
        break;
      case DirectoryWatcherImportAction.ADD_TO_SUBMISSION:
        // eslint-disable-next-line no-restricted-syntax
        for (const submissionId of watcher.submissionIds ?? []) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await this.submissionService.appendFile(submissionId, multerInfo);
          } catch (err) {
            this.logger.error(err, 'Unable to append file');
          }
        }

        break;
      default:
        break;
    }

    rename(
      filePath,
      join(watcher.path, `${PROCESSED_NAME}_${fileName}`),
      (err) => {
        if (err) {
          this.logger.error(err);
        }
      }
    );
  }

  async create(
    createDto: CreateDirectoryWatcherDto
  ): Promise<DirectoryWatcher> {
    const entity = this.repository.create(createDto);
    await this.repository.persistAndFlush(entity);
    return entity;
  }

  update(id: string, update: UpdateDirectoryWatcherDto) {
    this.logger.info(update, `Updating DirectoryWatcher '${id}'`);
    return this.repository.update(id, update);
  }
}
