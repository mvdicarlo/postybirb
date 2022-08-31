import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { read, removeFile } from '@postybirb/fs';
import { Log, Logger } from '@postybirb/logger';
import type { queueAsPromised } from 'fastq';
import * as fastq from 'fastq';
import { async as hash } from 'hasha';
import { cpus } from 'os';
import { Sharp } from 'sharp';
import { v4 as uuid } from 'uuid';
import {
  AltFile,
  PrimaryFile,
  SubmissionFile,
  ThumbnailFile,
} from '../database/entities/';
import { FileSubmission } from '../submission/models/file-submission';
import { IFileBuffer } from './models/file-buffer';
import { MulterFileInfo } from './models/multer-file-info';
import { ImageUtil } from './utils/image.util';

type Task = {
  file: MulterFileInfo;
  submission?: FileSubmission;
};

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
  >(this, this.createTask, Math.min(cpus().length, 2));

  constructor(
    @InjectRepository(SubmissionFile)
    private readonly fileRepository: EntityRepository<SubmissionFile>,
    @InjectRepository(PrimaryFile)
    private readonly primaryFileRepository: EntityRepository<PrimaryFile>,
    @InjectRepository(AltFile)
    private readonly altFileRepository: EntityRepository<AltFile>,
    @InjectRepository(ThumbnailFile)
    private readonly thumbnailRepository: EntityRepository<ThumbnailFile>
  ) {}

  /**
   * Returns file by Id.
   *
   * @param {string} id
   */
  async findFile(id: string, loadData = false): Promise<SubmissionFile> {
    try {
      const entity = await this.fileRepository.findOneOrFail(
        { id },
        { populate: loadData ? ['altFile', 'thumbnail', 'file'] : false }
      );

      return entity;
    } catch (e) {
      this.logger.error(e.message, e.stack);
      throw new NotFoundException(id);
    }
  }

  /**
   * Deletes a file.
   *
   * @param {string} id
   * @return {*}
   */
  @Log()
  public async remove(id: string) {
    return this.fileRepository.removeAndFlush(await this.findFile(id));
  }

  /**
   * Queues a file to create a database record.
   *
   * @param {MulterFileInfo} file
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async create(
    file: MulterFileInfo,
    submission?: FileSubmission
  ): Promise<SubmissionFile> {
    return this.queue.push({ file, submission });
  }

  private async createTask(task: Task): Promise<SubmissionFile> {
    return this.createFile(task.file, task.submission);
  }

  /**
   * Creates file entity and stores it.
   * @todo extra data (image resize per website)
   * @todo figure out what to do about non-image
   *
   * @param {MulterFileInfo} file
   * @return {*}  {Promise<SubmissionFile>}
   */
  @Log()
  private async createFile(
    file: MulterFileInfo,
    submission?: FileSubmission
  ): Promise<SubmissionFile> {
    try {
      const { mimetype: mimeType, originalname, size } = file;
      const fileEntity = this.fileRepository.create({
        id: uuid(),
        mimeType,
        fileName: originalname,
        size,
        submission,
      });

      const buf: Buffer = await read(file.path);
      let thumbnail: IFileBuffer;
      if (ImageUtil.isImage(file.mimetype, true)) {
        const sharpInstance = ImageUtil.load(buf);
        const { height, width } = await sharpInstance.metadata();
        fileEntity.width = width;
        fileEntity.height = height;

        thumbnail = await this.createFileThumbnail(
          fileEntity,
          file,
          sharpInstance
        );
      }

      fileEntity.file = this.createFileBufferEntity(fileEntity, buf, 'primary');
      fileEntity.thumbnail = thumbnail;
      fileEntity.hash = await hash(buf, { algorithm: 'md5' });

      await this.fileRepository.persistAndFlush(fileEntity);
      return await this.findFile(fileEntity.id);
    } catch (err) {
      this.logger.error(err.message, err.stack);
      return await Promise.reject(err);
    } finally {
      await removeFile(file.path);
    }
  }

  /**
   * Returns a thumbnail entity for a file.
   *
   * @param {File} fileEntity
   * @param {MulterFileInfo} file
   * @return {*}  {Promise<IFileBuffer>}
   */
  private async createFileThumbnail(
    fileEntity: SubmissionFile,
    file: MulterFileInfo,
    sharpInstance: Sharp
  ): Promise<IFileBuffer> {
    const preferredDimension = 300;

    let width = preferredDimension;
    let height = Math.floor(
      fileEntity.height
        ? (fileEntity.height / fileEntity.width) * preferredDimension
        : preferredDimension
    );

    if (fileEntity.height) {
      height = Math.min(fileEntity.height, height);
    }

    if (fileEntity.width) {
      width = Math.min(fileEntity.width, width);
    }

    const thumbnailBuf = await sharpInstance
      .resize(width, height)
      .jpeg({ quality: 88, force: true })
      .toBuffer();

    const thumbnailEntity = this.createFileBufferEntity(
      fileEntity,
      thumbnailBuf,
      'thumbnail'
    );

    thumbnailEntity.height = height;
    thumbnailEntity.width = width;
    thumbnailEntity.fileName = `thumbnail_${thumbnailEntity.fileName}.jpg`;
    thumbnailEntity.mimeType = 'image/jpeg';

    return thumbnailEntity;
  }

  /**
   * Creates a file buffer entity for storing blob data of a file.
   *
   * @param {File} fileEntity
   * @param {Buffer} buf
   * @param {string} type - thumbnail/alt/primary
   * @return {*}  {IFileBuffer}
   */
  private createFileBufferEntity(
    fileEntity: SubmissionFile,
    buf: Buffer,
    type: 'thumbnail' | 'alt' | 'primary'
  ): IFileBuffer {
    const { mimeType, height, width, fileName } = fileEntity;
    const data: Partial<IFileBuffer> = {
      id: uuid(),
      buffer: buf,
      parent: fileEntity,
      height,
      width,
      fileName,
      mimeType,
      size: buf.length,
    };

    switch (type) {
      case 'primary':
        return this.primaryFileRepository.create(data);
      case 'alt':
        return this.altFileRepository.create(data);
      case 'thumbnail':
        return this.thumbnailRepository.create(data);
      default:
        throw new BadRequestException(`${type} is not a valid option`);
    }
  }
}
