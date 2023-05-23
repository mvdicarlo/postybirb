/* eslint-disable no-param-reassign */
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { read } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import { FileSubmission } from '@postybirb/types';
import type { queueAsPromised } from 'fastq';
import * as fastq from 'fastq';
import { readFile } from 'fs/promises';
import { cpus } from 'os';
import { SubmissionFile } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { MulterFileInfo, TaskOrigin } from './models/multer-file-info';
import { CreateTask, Task, UpdateTask } from './models/task';
import { TaskType } from './models/task-type.enum';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

/**
 * Service that handles storing file data into database.
 * @todo text encoding parsing and file name conversion (no periods)
 *
 * @class FileService
 */
@Injectable()
export class FileService {
  private readonly logger = Logger(FileService.name);

  private readonly queue: queueAsPromised<Task, SubmissionFile> = fastq.promise<
    this,
    Task
  >(this, this.doTask, Math.min(cpus().length, 3));

  constructor(
    private readonly createFileService: CreateFileService,
    private readonly updateFileService: UpdateFileService,
    @InjectRepository(SubmissionFile)
    private readonly fileRepository: PostyBirbRepository<SubmissionFile>
  ) {}

  /**
   * Deletes a file.
   *
   * @param {string} id
   * @return {*}
   */
  public async remove(id: string) {
    this.logger.log(id, `Removing entity '${id}'`);
    return this.fileRepository.removeAndFlush(
      await this.fileRepository.findById(id)
    );
  }

  /**
   * Queues a file to create a database record.
   *
   * @param {MulterFileInfo} file
   * @param {FileSubmission} submission
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async create(
    file: MulterFileInfo,
    submission: FileSubmission
  ): Promise<SubmissionFile> {
    return this.queue.push({ type: TaskType.CREATE, file, submission });
  }

  /**
   * Queues a file to update.
   *
   * @param {MulterFileInfo} file
   * @param {FileSubmission} submission
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async update(
    file: MulterFileInfo,
    submission: FileSubmission
  ): Promise<SubmissionFile> {
    return this.queue.push({ type: TaskType.UPDATE, file, submission });
  }

  private async doTask(task: Task): Promise<SubmissionFile> {
    const buf: Buffer = await this.getFile(task.file.path, task.file.origin);
    switch (task.type) {
      case TaskType.CREATE:
        // eslint-disable-next-line no-case-declarations
        const ct = task as CreateTask;
        return this.createFileService.create(ct.file, ct.submission, buf);
      case TaskType.UPDATE:
        // eslint-disable-next-line no-case-declarations
        const ut = task as UpdateTask;
        return this.updateFileService.update(
          ut.file,
          ut.submissionFileId,
          buf,
          ut.target
        );
      default:
        throw new BadRequestException(`Unknown TaskType '${task.type}'`);
    }
  }

  private async getFile(path: string, taskOrigin: TaskOrigin): Promise<Buffer> {
    switch (taskOrigin) {
      case 'directory-watcher':
        return readFile(path);
      default:
        // Approved location
        return read(path);
    }
  }
}
