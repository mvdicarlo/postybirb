import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import 'multer';
import { Repository } from 'typeorm';
import { FILE_DATA_REPOSITORY, FILE_REPOSITORY } from '../constants';
import { FileData } from './entities/file-data.entity';
import { File } from './entities/file.entity';
import { ImageUtil } from './utils/image.util';
import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { removeFile, read } from '@postybirb/fs';
import { nativeImage } from 'electron';

@Injectable()
export class FileService {
  private readonly logger: Logger = new Logger(FileService.name);

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
   * Creates file entity and stores it.
   * @todo extra data (image resize per website)
   * @todo isLinux check
   * @todo figure out what to do about non-image
   *
   * @param {Express.Multer.File} file
   * @return {*}  {Promise<File>}
   */
  public async createFile(file: Express.Multer.File): Promise<File> {
    console.log(file);
    try {
      this.logger.log(`Creating file ${file.originalname} (${file.mimetype})`);
      const { mimetype, originalname, size } = file;
      const fileEntity = this.fileRepository.create({
        id: uuid(),
        mimetype,
        filename: originalname,
        size,
      });

      const buf: Buffer = await read(file.path);
      if (ImageUtil.isImage(file.mimetype, true)) {
        const { height, width } = await ImageUtil.getMetadata(buf);
        fileEntity.width = width;
        fileEntity.height = height;
      }

      const data = this.createFileDataEntity(fileEntity, buf);
      fileEntity.data = Promise.resolve(data);

      const thumbnail = await this.createFileThumbnail(fileEntity, file);
      fileEntity.thumbnail = Promise.resolve(thumbnail);

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
   * @return {*}  {Promise<File>}
   */
  private async createFileThumbnail(
    fileEntity: File,
    file: Express.Multer.File
  ): Promise<File> {
    const fileThumbnailEntity = this.fileRepository.create({
      id: uuid(),
      filename: `thumb_${fileEntity.filename}.jpg`,
      mimetype: 'image/jpeg',
    });

    const preferredDimension = 400;

    let width = preferredDimension;
    let height = Math.floor(
      fileEntity.height
        ? (fileEntity.width / fileEntity.height) * preferredDimension
        : preferredDimension
    );

    if (fileEntity.height) {
      height = Math.min(fileEntity.height, height);
    }

    if (fileEntity.width) {
      width = Math.min(fileEntity.width, width);
    }

    const thumbnail = await nativeImage.createThumbnailFromPath(file.path, {
      width,
      height,
    });

    const thumbnailBuf = thumbnail.toJPEG(99);

    fileThumbnailEntity.height = height;
    fileThumbnailEntity.width = width;
    fileThumbnailEntity.size = thumbnailBuf.length;

    const data = this.createFileDataEntity(fileThumbnailEntity, thumbnailBuf);
    fileThumbnailEntity.data = Promise.resolve(data);

    return fileThumbnailEntity;
  }

  /**
   * Creates a file data entity for storing blob data of a file.
   *
   * @param {File} fileEntity
   * @param {Buffer} buf
   * @return {*}  {FileData}
   */
  private createFileDataEntity(fileEntity: File, buf: Buffer): FileData {
    const fileDataEntity = this.fileDataRepository.create({
      id: fileEntity.id,
      data: buf,
    });
    return fileDataEntity;
  }
}
