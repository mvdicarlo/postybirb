import * as rtf from '@iarna/rtf-to-html';
import { Injectable } from '@nestjs/common';
import { Insert, Select } from '@postybirb/database';
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
import { parse } from 'path';
import { Sharp } from 'sharp';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';

import {
  FileBuffer,
  fromDatabaseRecord,
  SubmissionFile,
} from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import {
  TransactionContext,
  withTransactionContext,
} from '../../drizzle/transaction-context';
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

      const newSubmission = await withTransactionContext(
        this.fileRepository.db,
        async (ctx) => {
          let entity = await this.createSubmissionFile(
            ctx,
            file,
            submission,
            buf,
          );

          if (ImageUtil.isImage(file.mimetype, true)) {
            this.logger.info('[Mutation] Populating as Image');
            entity = await this.populateAsImageFile(ctx, entity, file, buf);
          }

          if (getFileType(file.originalname) === FileType.TEXT) {
            await this.createSubmissionTextAltFile(ctx, entity, file, buf);
          }

          const primaryFile = await this.createFileBufferEntity(
            ctx,
            entity,
            buf,
          );
          await ctx
            .getDb()
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
      throw err;
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
    ctx: TransactionContext,
    entity: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    // Default to empty string - all TEXT files get an alt file
    let altText = '';

    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.originalname.endsWith('.docx') ||
      file.originalname.endsWith('.doc')
    ) {
      this.logger.info('[Mutation] Creating Alt File for Text Document: DOCX');
      altText = (await mammoth.convertToHtml({ buffer: buf })).value;
    } else if (
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
    } else if (
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.txt')
    ) {
      this.logger.info('[Mutation] Creating Alt File for Text Document: TXT');
      altText = buf.toString();
    } else {
      this.logger.info(
        `[Mutation] Creating empty Alt File for unsupported text format: ${file.mimetype}`,
      );
    }

    const prettifiedBuf = Buffer.from(
      altText ? htmlBeautify(altText, { wrap_line_length: 120 }) : '',
    );
    const altFile = await this.createFileBufferEntity(
      ctx,
      entity,
      prettifiedBuf,
      {
        mimeType: 'text/html',
        fileName: `${entity.fileName}.html`,
      },
    );
    await ctx
      .getDb()
      .update(this.fileRepository.schemaEntity)
      .set({
        altFileId: altFile.id,
        hasAltFile: true,
      })
      .where(eq(this.fileRepository.schemaEntity.id, entity.id));
    this.logger.withMetadata({ id: altFile.id }).info('Alt File Created');
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
    ctx: TransactionContext,
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
      await ctx
        .getDb()
        .insert(this.fileRepository.schemaEntity)
        .values(submissionFile)
        .returning(),
    );

    const entity = sf[0];
    ctx.track('SubmissionFileSchema', entity.id);
    return entity;
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
    ctx: TransactionContext,
    entity: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ): Promise<SubmissionFile> {
    const sharpInstance = ImageUtil.load(buf);

    const meta = await sharpInstance.metadata();
    const thumbnail = await this.createFileThumbnail(
      ctx,
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
      await ctx
        .getDb()
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
    ctx: TransactionContext,
    fileEntity: SubmissionFile,
    file: MulterFileInfo,
    sharpInstance: Sharp,
  ): Promise<IFileBuffer> {
    const {
      buffer: thumbnailBuf,
      height,
      width,
      mimeType: thumbnailMimeType,
    } = await this.generateThumbnail(
      sharpInstance,
      fileEntity.height,
      fileEntity.width,
      file.mimetype,
    );

    // Remove existing extension and add the appropriate thumbnail extension
    const fileNameWithoutExt = parse(fileEntity.fileName).name;
    const thumbnailExt = thumbnailMimeType === 'image/jpeg' ? 'jpg' : 'png';

    return this.createFileBufferEntity(ctx, fileEntity, thumbnailBuf, {
      height,
      width,
      mimeType: thumbnailMimeType,
      fileName: `thumbnail_${fileNameWithoutExt}.${thumbnailExt}`,
    });
  }

  /**
   * Generates a thumbnail for display at specific dimension requirements.
   *
   * @param {Sharp} sharpInstance
   * @param {number} fileHeight
   * @param {number} fileWidth
   * @param {string} sourceMimeType - The mimetype of the source image
   * @return {*}  {Promise<{ width: number; height: number; buffer: Buffer; mimeType: string }>}
   */
  public async generateThumbnail(
    sharpInstance: Sharp,
    fileHeight: number,
    fileWidth: number,
    sourceMimeType: string,
  ): Promise<{
    width: number;
    height: number;
    buffer: Buffer;
    mimeType: string;
  }> {
    const preferredDimension = 400;

    // Resize with aspect ratio preserved - Sharp will calculate the other dimension
    const resized = sharpInstance.resize(
      preferredDimension,
      preferredDimension,
      {
        fit: 'inside', // Ensure image fits within the box while maintaining aspect ratio
        withoutEnlargement: true, // Don't enlarge if image is smaller than target
      },
    );

    const isJpeg =
      sourceMimeType === 'image/jpeg' || sourceMimeType === 'image/jpg';
    const buffer = isJpeg
      ? await resized.jpeg({ quality: 99, force: true }).toBuffer()
      : await resized.png({ quality: 99, force: true }).toBuffer();
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

    // Get the actual dimensions after the buffer is generated
    const metadata = await ImageUtil.load(buffer).metadata();
    const width = metadata.width ?? preferredDimension;
    const height = metadata.height ?? preferredDimension;

    return { buffer, height, width, mimeType };
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
    ctx: TransactionContext,
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

    const result = fromDatabaseRecord(
      FileBuffer,
      await ctx
        .getDb()
        .insert(this.fileBufferRepository.schemaEntity)
        .values(data)
        .returning(),
    )[0];

    ctx.track('FileBufferSchema', result.id);
    return result;
  }
}
