import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
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

// TODO update

const PROCESSED_NAME = 'pb_read';

@Injectable()
export class DirectoryWatchersService extends PostyBirbService<DirectoryWatcher> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    @InjectRepository(DirectoryWatcher)
    repository: PostyBirbRepository<DirectoryWatcher>,
    private readonly submissionService: SubmissionService,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  private async run() {
    const entities = await this.repository.findAll();
    entities.filter((e) => !!e.path).forEach((e) => this.read(e));
  }

  private async read(watcher: DirectoryWatcher) {
    const filesInDirectory = await readdir(watcher.path);
    filesInDirectory
      .filter((file) => !file.startsWith(PROCESSED_NAME))
      .forEach((file) => this.processFile(watcher, file));
  }

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

  remove(id: string) {
    this.logger.info({}, `Removing DirectoryWatcher '${id}'`);
    return this.repository.delete(id);
  }

  async update(update: UpdateDirectoryWatcherDto): Promise<boolean> {
    const entity: DirectoryWatcher = await this.repository.findById(update.id, {
      failOnMissing: true,
    });
    entity.path = update.path;
    entity.importAction = update.importAction;
    entity.submissionIds = update.submissionIds;

    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}
