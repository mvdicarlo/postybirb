import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { read, removeFile } from '@postybirb/fs';
import { Log, Logger } from '@postybirb/logger';
import { Express } from 'express';
import type { queueAsPromised } from 'fastq';
import * as fastq from 'fastq';
import 'multer';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { FILE_DATA_REPOSITORY, FILE_REPOSITORY } from '../constants';
import { FileData } from './entities/file-data.entity';
import { File } from './entities/file.entity';
import { ImageUtil } from './utils/image.util';
import { Sharp } from 'sharp';
import { cpus } from 'os';
import { async as hash } from 'hasha';

type Task = {
  file: Express.Multer.File;
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
  private readonly queue: queueAsPromised<Task, File> = fastq.promise<
    this,
    Task
  >(this, this.createTask, Math.min(cpus().length, 2));

  constructor(
    @Inject(FILE_REPOSITORY)
    private readonly fileRepository: Repository<File>,
    @Inject(FILE_DATA_REPOSITORY)
    private readonly fileDataRepository: Repository<FileData>
  ) {}

  /**
   * Returns file by Id.
   *
   * @param {string} id
   */
  async findFile(id: string, loadData: boolean = false) {
    try {
      const entity = await this.fileRepository.findOneOrFail(id);

      if (loadData) {
        await entity.data;
      }

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
    return await this.fileRepository.delete(id);
  }

  /**
   * Queues a file to create a database record.
   *
   * @param {Express.Multer.File} file
   * @return {*}  {Promise<File>}
   */
  public async create(file: Express.Multer.File): Promise<File> {
    return await this.queue.push({ file });
  }

  private async createTask(task: Task): Promise<File> {
    return await this.createFile(task.file);
  }

  /**
   * Creates file entity and stores it.
   * @todo extra data (image resize per website)
   * @todo figure out what to do about non-image
   *
   * @param {Express.Multer.File} file
   * @return {*}  {Promise<File>}
   */
  @Log()
  private async createFile(file: Express.Multer.File): Promise<File> {
    try {
      const { mimetype, originalname, size } = file;
      const fileEntity = this.fileRepository.create({
        id: uuid(),
        mimetype,
        filename: originalname,
        size,
      });

      const buf: Buffer = await read(file.path);
      let thumbnail: FileData;
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

      const data = this.createFileDataEntity(fileEntity, buf);
      fileEntity.data = Promise.resolve(thumbnail ? [data, thumbnail] : [data]);
      fileEntity.hash = await hash(buf, { algorithm: 'md5' });

      const savedEntity = await this.fileRepository.save(fileEntity);
      return savedEntity;
    } catch (err) {
      this.logger.error(err.message, err.stack);
      return Promise.reject(err);
    } finally {
      await removeFile(file.path);
    }
  }

  /**
   * Returns a thumbnail entity for a file.
   *
   * @param {File} fileEntity
   * @param {Express.Multer.File} file
   * @return {*}  {Promise<FileData>}
   */
  private async createFileThumbnail(
    fileEntity: File,
    file: Express.Multer.File,
    sharpInstance: Sharp
  ): Promise<FileData> {
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
      .jpeg({ quality: 90, force: true })
      .toBuffer();

    const thumbnailEntity = this.createFileDataEntity(fileEntity, thumbnailBuf);

    thumbnailEntity.height = height;
    thumbnailEntity.width = width;
    thumbnailEntity.filename = `thumbnail_${thumbnailEntity.filename}.jpg`;
    thumbnailEntity.mimetype = 'image/jpeg';

    return thumbnailEntity;
  }

  /**
   * Creates a file data entity for storing blob data of a file.
   *
   * @param {File} fileEntity
   * @param {Buffer} buf
   * @return {*}  {FileData}
   */
  private createFileDataEntity(fileEntity: File, buf: Buffer): FileData {
    const { mimetype, height, width, filename } = fileEntity;
    const fileDataEntity = this.fileDataRepository.create({
      id: uuid(),
      buffer: buf,
      file: fileEntity,
      height,
      width,
      filename,
      mimetype,
    });
    return fileDataEntity;
  }
}
