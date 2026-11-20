import {
  EntityId,
  FileSubmission,
  ReorderSubmissionFilesDto,
  SubmissionFileMetadata,
  SubmissionId,
  UpdateAltFileDto,
} from '@postybirb/types';
/* eslint-disable no-param-reassign */
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  FileBufferRepository,
  SubmissionFile,
  SubmissionFileRepository,
  withTransactionContext,
} from '@postybirb/database';
import { read } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import { and, asc, eq, gt, isNull, like, or } from 'drizzle-orm';

import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { readFile } from 'fs/promises';
import { cpus } from 'os';

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
export class FileService implements OnModuleInit {
  private readonly logger = Logger();

  private readonly queue: queueAsPromised<Task, SubmissionFile> = fastq.promise<
    this,
    Task
  >(this, this.doTask, Math.min(cpus().length, 5));

  private readonly fileBufferRepository = new FileBufferRepository();

  private readonly fileRepository = new SubmissionFileRepository();

  constructor(
    private readonly createFileService: CreateFileService,
    private readonly updateFileService: UpdateFileService,
  ) {}

  async onModuleInit(): Promise<void> {
    const { table } = this.fileRepository;
    let lastId: EntityId | undefined;
    let hasMore = true;

    while (hasMore) {
      const files = await this.fileRepository.find({
        where: and(
          like(table.mimeType, 'image/%'),
          or(eq(table.hasThumbnail, false), isNull(table.thumbnailId)),
          lastId ? gt(table.id, lastId) : undefined,
        ),
        orderBy: asc(table.id),
        limit: 100,
      });

      for (const file of files) {
        try {
          await this.ensureThumbnail(file.id);
        } catch (error) {
          this.logger
            .withError(error)
            .error(`Failed to generate missing thumbnail for file '${file.id}'`);
        }
      }

      lastId = files.at(-1)?.id;
      hasMore = files.length === 100;
    }
  }

  public async ensureThumbnail(id: EntityId): Promise<void> {
    const file = await this.findFile(id);
    if (!file.mimeType.startsWith('image/')) return;

    if (file.thumbnailId) {
      if (!file.hasThumbnail) {
        await this.fileRepository.update(id, { hasThumbnail: true });
      }
      return;
    }

    const source = await this.fileBufferRepository.findByIdOrThrow(
      file.primaryFileId,
    );
    await withTransactionContext(this.fileRepository.db, async (ctx) => {
      const thumbnail = await this.createFileService.createFileThumbnail(
        ctx,
        file,
        { mimetype: file.mimeType },
        source.buffer,
      );
      await ctx
        .getDb()
        .update(this.fileRepository.table)
        .set({ thumbnailId: thumbnail.id, hasThumbnail: true })
        .where(eq(this.fileRepository.table.id, id));
    });
  }

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

  private async getFile(
    path: string,
    taskOrigin: TaskOrigin | undefined,
  ): Promise<Buffer> {
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
    return this.fileRepository.findByIdOrThrow(id);
  }

  public async findSubmissionIdForBuffer(id: EntityId): Promise<SubmissionId> {
    const buffer = await this.fileBufferRepository.findByIdOrThrow(id);
    const submissionFile = await this.findFile(buffer.submissionFileId);
    return submissionFile.submissionId;
  }

  /**
   * Gets the size of an alt text file without loading the buffer.
   * @param {EntityId} id
   */
  async getAltFileSize(id: EntityId): Promise<number> {
    const altFile = await this.fileBufferRepository.findById(id);
    return altFile?.size ?? 0;
  }

  /**
   * Gets the raw text of an alt text file.
   * @param {EntityId} id
   */
  async getAltText(id: EntityId): Promise<string> {
    const altFile = await this.fileBufferRepository.findByIdOrThrow(id);
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
    const buffer = Buffer.from(update.text ?? '');
    return this.fileBufferRepository.update(id, {
      buffer,
      mimeType: 'text/plain',
      size: buffer.length,
    });
  }

  async updateMetadata(id: string, update: SubmissionFileMetadata) {
    const file = await this.findFile(id);
    const merged = { ...file.metadata, ...update };
    await this.fileRepository.update(id, { metadata: merged });
  }

  async reorderFiles(update: ReorderSubmissionFilesDto) {
    await Promise.all(
      Object.entries(update.order).map(([id, order]) =>
        this.fileRepository.update(id, { order }),
      ),
    );
  }
}
