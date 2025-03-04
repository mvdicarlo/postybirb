/* eslint-disable no-param-reassign */
import { BadRequestException, Injectable } from '@nestjs/common';
import { read } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import { EntityId, FileSubmission } from '@postybirb/types';
import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { readFile } from 'fs/promises';
import { cpus } from 'os';
import { SubmissionFile } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { UpdateAltFileDto } from '../submission/dtos/update-alt-file.dto';
import { MulterFileInfo, TaskOrigin } from './models/multer-file-info';
import { CreateTask, Task, UpdateTask } from './models/task';
import { TaskType } from './models/task-type.enum';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

/**
 * Service that handles storing file data into database.
 * @todo text encoding parsing and file name conversion (no periods)
 */
@Injectable()
export class FileService {
  private readonly logger = Logger();

  private readonly queue: queueAsPromised<Task, SubmissionFile> = fastq.promise<
    this,
    Task
  >(this, this.doTask, Math.min(cpus().length, 5));

  private readonly fileBufferRepository = new PostyBirbDatabase(
    'FileBufferSchema',
  );

  private readonly fileRepository = new PostyBirbDatabase(
    'SubmissionFileSchema',
  );

  constructor(
    private readonly createFileService: CreateFileService,
    private readonly updateFileService: UpdateFileService,
  ) {}

  /**
   * Deletes a file.
   *
   * @param {EntityId} id
   * @return {*}
   */
  public async remove(id: EntityId) {
    this.logger.info(id, `Removing entity '${id}'`);
    return this.fileRepository.deleteById([id]);
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
    submission: FileSubmission,
  ): Promise<SubmissionFile> {
    return this.queue.push({ type: TaskType.CREATE, file, submission });
  }

  /**
   * Queues a file to update.
   *
   * @param {MulterFileInfo} file
   * @param {EntityId} submissionFileId
   * @param {boolean} forThumbnail
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async update(
    file: MulterFileInfo,
    submissionFileId: EntityId,
    forThumbnail: boolean,
  ): Promise<SubmissionFile> {
    return this.queue.push({
      type: TaskType.UPDATE,
      file,
      submissionFileId,
      target: forThumbnail ? 'thumbnail' : undefined,
    });
  }

  private async doTask(task: Task): Promise<SubmissionFile> {
    task.file.originalname = this.sanitizeFilename(task.file.originalname);
    const buf: Buffer = await this.getFile(task.file.path, task.file.origin);
    this.logger.withMetadata(task).info('Reading File');
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
          ut.target,
        );
      default:
        throw new BadRequestException(`Unknown TaskType '${task.type}'`);
    }
  }

  /**
   * Removes periods from the filename.
   * There is some website that doesn't like them.
   *
   * @param {string} filename
   * @return {*}  {string}
   */
  private sanitizeFilename(filename: string): string {
    const nameParts = filename.split('.');
    const ext = nameParts.pop();
    return `${nameParts.join('_')}.${ext}`;
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

  /**
   * Returns file by Id.
   *
   * @param {EntityId} id
   */
  public async findFile(id: EntityId): Promise<SubmissionFile> {
    return this.fileRepository.findById(id, { failOnMissing: true });
  }

  /**
   * Gets the raw text of an alt text file.
   * @param {EntityId} id
   */
  async getAltText(id: EntityId): Promise<string> {
    const altFile = await this.fileBufferRepository.findById(id, {
      failOnMissing: true,
    });
    if (altFile.size) {
      return altFile.buffer.toString();
    }

    return '';
  }

  /**
   * Updates the raw text of an alt text file.
   * @param {EntityId} id
   * @param {UpdateAltFileDto} update
   */
  async updateAltText(id: EntityId, update: UpdateAltFileDto) {
    return this.fileBufferRepository.update(id, {
      buffer: Buffer.from(update.html ?? ''),
    });
  }
}
