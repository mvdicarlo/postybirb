/* eslint-disable no-param-reassign */
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { removeFile } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import { FileSubmission, IFileBuffer } from '@postybirb/types';
import { async as hash } from 'hasha';
import { Sharp } from 'sharp';
import { v4 as uuid } from 'uuid';
import {
  AltFile,
  PrimaryFile,
  SubmissionFile,
  ThumbnailFile,
} from '../../database/entities';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { MulterFileInfo } from '../models/multer-file-info';
import { ImageUtil } from '../utils/image.util';

@Injectable()
export class CreateFileService {
  private readonly logger = Logger(CreateFileService.name);

  constructor(
    @InjectRepository(SubmissionFile)
    private readonly fileRepository: PostyBirbRepository<SubmissionFile>,
    @InjectRepository(PrimaryFile)
    private readonly primaryFileRepository: PostyBirbRepository<PrimaryFile>,
    @InjectRepository(AltFile)
    private readonly altFileRepository: PostyBirbRepository<AltFile>,
    @InjectRepository(ThumbnailFile)
    private readonly thumbnailRepository: PostyBirbRepository<ThumbnailFile>
  ) {}

  /**
   * Creates file entity and stores it.
   * @todo extra data (image resize per website)
   * @todo figure out what to do about non-image
   *
   * @param {MulterFileInfo} file
   * @param {MulterFileInfo} submission
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async create(
    file: MulterFileInfo,
    submission: FileSubmission,
    buf: Buffer
  ): Promise<SubmissionFile> {
    try {
      this.logger.debug(file, `Creating SubmissionFile entity`);
      const entity = await this.createSubmissionFile(file, submission, buf);

      if (ImageUtil.isImage(file.mimetype, true)) {
        this.logger.debug(file.mimetype, '[Mutation] Populating as Image');
        await this.populateAsImageFile(entity, file, buf);
      }

      await this.fileRepository.persistAndFlush(entity);
      return entity;
    } catch (err) {
      this.logger.error(err.message, err.stack);
      return await Promise.reject(err);
    } finally {
      if (!file.origin) {
        await removeFile(file.path);
      }
    }
  }

  private async createSubmissionFile(
    file: MulterFileInfo,
    submission: FileSubmission,
    buf: Buffer
  ): Promise<SubmissionFile> {
    const { mimetype: mimeType, originalname, size } = file;
    const entity = this.fileRepository.create({
      id: uuid(),
      mimeType,
      fileName: originalname,
      size,
      submission,
    });

    entity.file = this.createFileBufferEntity(entity, buf, 'primary');
    entity.hash = await hash(buf, { algorithm: 'sha256' });

    return entity;
  }

  private async populateAsImageFile(
    entity: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer
  ): Promise<void> {
    const sharpInstance = ImageUtil.load(buf);
    const { height, width } = await sharpInstance.metadata();
    entity.width = width;
    entity.height = height;
    entity.hasThumbnail = true;
    entity.thumbnail = await this.createFileThumbnail(
      entity,
      file,
      sharpInstance
    );
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
    thumbnailEntity.fileName = `thumbnail_${thumbnailEntity.fileName}.png`;
    thumbnailEntity.mimeType = 'image/png';

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
      .png({ quality: 90, force: true })
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
