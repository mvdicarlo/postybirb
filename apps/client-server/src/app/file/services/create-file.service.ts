import * as rtf from '@iarna/rtf-to-html';
import { Injectable } from '@nestjs/common';
import { Insert, PostyBirbTransaction, Select } from '@postybirb/database';
import { removeFile } from '@postybirb/fs';
import { Logger } from '@postybirb/logger';
import {
  DefaultSubmissionFileMetadata,
  FileSubmission,
  FileType,
  IFileBuffer,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { eq } from 'drizzle-orm';
import { async as hash } from 'hasha';
import { html as htmlBeautify } from 'js-beautify';
import * as mammoth from 'mammoth';
import { Sharp } from 'sharp';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';

import {
  FileBuffer,
  fromDatabaseRecord,
  SubmissionFile,
} from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { MulterFileInfo } from '../models/multer-file-info';
import { ImageUtil } from '../utils/image.util';

/**
 * A Service that defines operations for creating a SubmissionFile.
 * @class CreateFileService
 */
@Injectable()
export class CreateFileService {
  private readonly logger = Logger();

  private readonly fileBufferRepository = new PostyBirbDatabase(
    'FileBufferSchema',
  );

  private readonly fileRepository = new PostyBirbDatabase(
    'SubmissionFileSchema',
  );

  /**
   * Creates file entity and stores it.
   * @todo extra data (image resize per website)
   * @todo figure out what to do about non-image
   *
   * @param {MulterFileInfo} file
   * @param {MulterFileInfo} submission
   * @param {Buffer} buf
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async create(
    file: MulterFileInfo,
    submission: FileSubmission,
    buf: Buffer,
  ): Promise<SubmissionFile> {
    try {
      this.logger.withMetadata(file).info(`Creating SubmissionFile entity`);
      const newSubmission = await this.fileRepository.db.transaction(
        async (tx: PostyBirbTransaction) => {
          let entity = await this.createSubmissionFile(
            tx,
            file,
            submission,
            buf,
          );

          if (ImageUtil.isImage(file.mimetype, true)) {
            this.logger.info('[Mutation] Populating as Image');
            entity = await this.populateAsImageFile(tx, entity, file, buf);
          }

          if (getFileType(file.originalname) === FileType.TEXT) {
            await this.createSubmissionTextAltFile(tx, entity, file, buf);
          }

          const primaryFile = await this.createFileBufferEntity(
            tx,
            entity,
            buf,
          );
          await tx
            .update(this.fileRepository.schemaEntity)
            .set({ primaryFileId: primaryFile.id })
            .where(eq(this.fileRepository.schemaEntity.id, entity.id));
          this.logger
            .withMetadata({ id: entity.id })
            .info('SubmissionFile Created');

          return entity;
        },
      );
      return await this.fileRepository.findById(newSubmission.id);
    } catch (err) {
      this.logger.error(err.message, err.stack);
      return await Promise.reject(err);
    } finally {
      if (!file.origin) {
        removeFile(file.path);
      }
    }
  }

  /**
   * Populates an alt file containing text data extracted from a file.
   * Currently supports docx, rtf, and plaintext.
   *
   * @param {SubmissionFile} entity
   * @param {MulterFileInfo} file
   * @param {Buffer} buf
   */
  async createSubmissionTextAltFile(
    tx: PostyBirbTransaction,
    entity: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    let altText: string;
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.originalname.endsWith('.docx') ||
      file.originalname.endsWith('.doc')
    ) {
      this.logger.info('[Mutation] Creating Alt File for Text Document: DOCX');
      altText = (await mammoth.convertToHtml({ buffer: buf })).value;
    }

    if (
      file.mimetype === 'application/rtf' ||
      file.originalname.endsWith('.rtf')
    ) {
      this.logger.info('[Mutation] Creating Alt File for Text Document: RTF');
      const promisifiedRtf = promisify(rtf.fromString);
      altText = await promisifiedRtf(buf.toString(), {
        template(_, __, content: string) {
          return content;
        },
      });
    }

    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      this.logger.info('[Mutation] Creating Alt File for Text Document: TXT');
      altText = buf.toString();
    }

    if (altText) {
      const prettifiedBuf = Buffer.from(
        htmlBeautify(altText, { wrap_line_length: 120 }),
      );
      const altFile = await this.createFileBufferEntity(
        tx,
        entity,
        prettifiedBuf,
        {
          mimeType: 'text/html',
          fileName: `${entity.fileName}.html`,
        },
      );
      await tx
        .update(this.fileRepository.schemaEntity)
        .set({
          altFileId: altFile.id,
          hasAltFile: true,
        })
        .where(eq(this.fileRepository.schemaEntity.id, entity.id));
      this.logger.withMetadata({ id: altFile.id }).info('Alt File Created');
    } else {
      this.logger.info('No Alt File Created');
    }
  }

  /**
   * Creates a SubmissionFile with pre-populated fields.
   *
   * @param {MulterFileInfo} file
   * @param {FileSubmission} submission
   * @param {Buffer} buf
   * @return {*}  {Promise<SubmissionFile>}
   */
  private async createSubmissionFile(
    tx: PostyBirbTransaction,
    file: MulterFileInfo,
    submission: FileSubmission,
    buf: Buffer,
  ): Promise<SubmissionFile> {
    const { mimetype: mimeType, originalname, size } = file;
    const submissionFile: Insert<'SubmissionFileSchema'> = {
      submissionId: submission.id,
      mimeType,
      fileName: originalname,
      size,
      hash: await hash(buf, { algorithm: 'sha256' }),
      width: 0,
      height: 0,
      hasThumbnail: false,
      metadata: DefaultSubmissionFileMetadata(),
      order: Date.now(),
    };
    const sf = fromDatabaseRecord(
      SubmissionFile,
      await tx
        .insert(this.fileRepository.schemaEntity)
        .values(submissionFile)
        .returning(),
    );

    return sf[0];
  }

  /**
   * Populates SubmissionFile with Image specific fields.
   * Width, Height, Thumbnail.
   *
   * @param {SubmissionFile} entity
   * @param {MulterFileInfo} file
   * @param {Buffer} buf
   * @return {*}  {Promise<void>}
   */
  private async populateAsImageFile(
    tx: PostyBirbTransaction,
    entity: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ): Promise<SubmissionFile> {
    const sharpInstance = ImageUtil.load(buf);

    const meta = await sharpInstance.metadata();
    const thumbnail = await this.createFileThumbnail(
      tx,
      entity,
      file,
      sharpInstance,
    );
    const update: Select<typeof this.fileRepository.schemaEntity> = {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      hasThumbnail: true,
      thumbnailId: thumbnail.id,
      metadata: {
        ...entity.metadata,
        dimensions: {
          default: {
            width: meta.width ?? 0,
            height: meta.height ?? 0,
          },
        },
      },
    };

    return fromDatabaseRecord(
      SubmissionFile,
      await tx
        .update(this.fileRepository.schemaEntity)
        .set(update)
        .where(eq(this.fileRepository.schemaEntity.id, entity.id))
        .returning(),
    )[0];
  }

  /**
   * Returns a thumbnail entity for a file.
   *
   * @param {SubmissionFile} fileEntity
   * @param {File} fileEntity
   * @param {MulterFileInfo} file
   * @param {Sharp} sharpInstance
   * @return {*}  {Promise<IFileBuffer>}
   */
  public async createFileThumbnail(
    tx: PostyBirbTransaction,
    fileEntity: SubmissionFile,
    file: MulterFileInfo,
    sharpInstance: Sharp,
  ): Promise<IFileBuffer> {
    const {
      buffer: thumbnailBuf,
      height,
      width,
    } = await this.generateThumbnail(
      sharpInstance,
      fileEntity.height,
      fileEntity.width,
    );
    return this.createFileBufferEntity(tx, fileEntity, thumbnailBuf, {
      height,
      width,
      mimeType: 'image/png',
      fileName: `thumbnail_${fileEntity.fileName}.png`,
    });
  }

  /**
   * Generates a thumbnail for display at specific dimension requirements.
   *
   * @param {Sharp} sharpInstance
   * @param {number} fileHeight
   * @param {number} fileWidth
   * @return {*}  {Promise<{ width: number; height: number; buffer: Buffer }>}
   */
  public async generateThumbnail(
    sharpInstance: Sharp,
    fileHeight: number,
    fileWidth: number,
  ): Promise<{ width: number; height: number; buffer: Buffer }> {
    const preferredDimension = 300;

    let width = preferredDimension;
    let height = Math.floor(
      fileHeight
        ? (fileHeight / fileWidth) * preferredDimension
        : preferredDimension,
    );

    if (fileHeight) {
      height = Math.min(fileHeight, height);
    }

    if (fileWidth) {
      width = Math.min(fileWidth, width);
    }

    const buffer = await sharpInstance
      .resize(width, height)
      .png({ quality: 92, force: true })
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
  public async createFileBufferEntity(
    tx: PostyBirbTransaction,
    fileEntity: SubmissionFile,
    buf: Buffer,
    opts: Select<'FileBufferSchema'> = {} as Select<'FileBufferSchema'>,
  ): Promise<FileBuffer> {
    const { mimeType, height, width, fileName } = fileEntity;
    const data: Insert<'FileBufferSchema'> = {
      id: uuid(),
      buffer: buf,
      submissionFileId: fileEntity.id,
      height,
      width,
      fileName,
      mimeType,
      size: buf.length,
      ...opts,
    };

    return fromDatabaseRecord(
      FileBuffer,
      await tx
        .insert(this.fileBufferRepository.schemaEntity)
        .values(data)
        .returning(),
    )[0];
  }
}
