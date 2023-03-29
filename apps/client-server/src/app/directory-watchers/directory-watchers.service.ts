import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { rename } from 'fs';
import { readdir } from 'fs/promises';
import { getType } from 'mime';
import { join } from 'path';
import { PostyBirbCRUDService } from '../common/service/postybirb-crud-service';
import { DirectoryWatcher } from '../database/entities';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { SubmissionService } from '../submission/services/submission.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

const PROCESSED_NAME = 'pb_read';

@Injectable()
export class DirectoryWatchersService extends PostyBirbCRUDService<DirectoryWatcher> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    moduleRef: ModuleRef,
    @InjectRepository(DirectoryWatcher)
    repository: EntityRepository<DirectoryWatcher>,
    private readonly submissionService: SubmissionService,
    @Optional() webSocket?: WSGateway
  ) {
    super(moduleRef, repository, webSocket);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  private async run() {
    const entities = await this.findAll();
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
        await this.submissionService.appendFile(
          watcher.submissionId,
          multerInfo
        );
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

  async update(update: UpdateDirectoryWatcherDto): Promise<boolean> {
    const entity: DirectoryWatcher = await this.findOne(update.id);
    entity.path = update.path;
    entity.importAction = update.importAction;

    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}
