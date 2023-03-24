/* eslint-disable no-param-reassign */
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { read, removeFile } from '@postybirb/fs';
import { Log, Logger } from '@postybirb/logger';
import { FileSubmission, FileType, IFileBuffer } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import type { queueAsPromised } from 'fastq';
import * as fastq from 'fastq';
import { readFile } from 'fs/promises';
import { async as hash } from 'hasha';
import { cpus } from 'os';
import { Sharp } from 'sharp';
import { v4 as uuid } from 'uuid';
import {
  AltFile,
  PrimaryFile,
  SubmissionFile,
  ThumbnailFile,
} from '../database/entities';
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
  async findFile(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    populate: readonly (keyof SubmissionFile)[] | boolean = false
  ): Promise<SubmissionFile> {
    try {
      const entity = await this.fileRepository.findOneOrFail(
        { id },
        { populate }
      );

      return entity;
    } catch (e) {
      this.logger.error(e.message, e.stack);
      throw new NotFoundException(id);
    }
  }

  async replaceFileThumbnail(fileId: string, file: MulterFileInfo) {
    const submissionFile = await this.findFile(fileId, ['thumbnail']);

    const thumbnailDetails = await this.getImageDetails(file);
    if (!submissionFile.thumbnail) {
      submissionFile.thumbnail = this.createFileBufferEntity(
        submissionFile,
        thumbnailDetails.buffer,
        'thumbnail'
      );
    }

    submissionFile.thumbnail.buffer = thumbnailDetails.buffer;
    submissionFile.thumbnail.mimeType = file.mimetype;
    submissionFile.thumbnail.width = thumbnailDetails.width;
    submissionFile.thumbnail.height = thumbnailDetails.height;

    submissionFile.hasThumbnail = true;
    submissionFile.props.hasCustomThumbnail = true;
    await this.fileRepository.persistAndFlush(submissionFile);
  }

  async replacePrimaryFile(submissionFileId: string, file: MulterFileInfo) {
    const submissionFile = await this.findFile(submissionFileId, [
      'file',
      'thumbnail',
    ]);
    const buf: Buffer = await read(file.path);
    await this.updateFileEntity(submissionFile, file, buf);
    await this.fileRepository.persistAndFlush(submissionFile);
  }

  private async updateFileEntity(
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buffer: Buffer
  ): Promise<void> {
    const fileHash = await hash(buffer, { algorithm: 'sha256' });

    // Only need to replace when unique file is given
    if (submissionFile.hash !== fileHash) {
      const fileType = getFileType(file.filename);
      if (fileType === FileType.IMAGE) {
        await this.updateImageFileProps(submissionFile, file);
      }

      // Update submission file entity
      submissionFile.size = buffer.length;
      submissionFile.fileName = file.filename;
      submissionFile.mimeType = file.mimetype;
      submissionFile.hash = fileHash;

      // Duplicate props to primary file
      submissionFile.file.buffer = buffer;
      submissionFile.file.fileName = submissionFile.fileName;
      submissionFile.file.mimeType = submissionFile.mimeType;
      submissionFile.file.width = submissionFile.width;
      submissionFile.file.height = submissionFile.height;
    }
  }

  private async updateImageFileProps(
    submissionFile: SubmissionFile,
    file: MulterFileInfo
  ) {
    const { width, height, sharpInstance } = await this.getImageDetails(file);
    submissionFile.width = width;
    submissionFile.height = height;

    if (
      submissionFile.hasThumbnail &&
      !submissionFile.props.hasCustomThumbnail
    ) {
      // Regenerate auto-thumbnail;
      const {
        buffer: thumbnailBuf,
        width: thumbnailWidth,
        height: thumbnailHeight,
      } = await this.generateThumbnail(sharpInstance, height, width);
      submissionFile.thumbnail.buffer = thumbnailBuf;
      submissionFile.thumbnail.width = thumbnailWidth;
      submissionFile.thumbnail.height = thumbnailHeight;
    }
  }

  /**
   * Details of a multer file.
   *
   * @param {MulterFileInfo} file
   */
  private async getImageDetails(file: MulterFileInfo) {
    if (ImageUtil.isImage(file.mimetype, false)) {
      const buf: Buffer = await read(file.path);
      const sharpInstance = ImageUtil.load(buf);
      const { height, width } = await sharpInstance.metadata();
      return { buffer: buf, width, height, sharpInstance };
    }

    throw new BadRequestException('File is not an image');
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
      const { fieldname, mimetype: mimeType, originalname, size } = file;
      const fileEntity = this.fileRepository.create({
        id: uuid(),
        mimeType,
        fileName: originalname,
        size,
        submission,
      });

      const buf: Buffer =
        // Only use standard read when from directory watchers
        fieldname === 'directory-watcher'
          ? await readFile(file.path)
          : await read(file.path);
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
      fileEntity.hasThumbnail = !!thumbnail;
      fileEntity.props.hasCustomThumbnail = !fileEntity.hasThumbnail;
      fileEntity.hash = await hash(buf, { algorithm: 'sha256' });

      if (!submission) {
        await this.fileRepository.persistAndFlush(fileEntity);
      }

      return fileEntity;
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
    const {
      buffer: thumbnailBuf,
      height,
      width,
    } = await this.generateThumbnail(
      sharpInstance,
      fileEntity.height,
      fileEntity.width
    );
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

  private async generateThumbnail(
    sharpInstance: Sharp,
    fileHeight: number,
    fileWidth: number
  ): Promise<{ width: number; height: number; buffer: Buffer }> {
    const preferredDimension = 300;

    let width = preferredDimension;
    let height = Math.floor(
      fileHeight
        ? (fileHeight / fileWidth) * preferredDimension
        : preferredDimension
    );

    if (fileHeight) {
      height = Math.min(fileHeight, height);
    }

    if (fileWidth) {
      width = Math.min(fileWidth, width);
    }

    const buffer = await sharpInstance
      .resize(width, height)
      .jpeg({ quality: 90, force: true })
      .toBuffer();

    return { buffer, height, width };
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
