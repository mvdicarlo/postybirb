/* eslint-disable no-param-reassign */
import * as rtf from '@iarna/rtf-to-html';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { EntityId, FileType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { eq } from 'drizzle-orm';
import { async as hash } from 'hasha';
import { html as htmlBeautify } from 'js-beautify';
import * as mammoth from 'mammoth';
import { parse } from 'path';
import { promisify } from 'util';
import { SubmissionFile } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import {
  TransactionContext,
  withTransactionContext,
} from '../../drizzle/transaction-context';
import { MulterFileInfo } from '../models/multer-file-info';
import { ImageUtil } from '../utils/image.util';
import { CreateFileService } from './create-file.service';

/**
 * A Service for updating existing SubmissionFile entities.
 */
@Injectable()
export class UpdateFileService {
  private readonly logger = Logger();

  private readonly fileRepository = new PostyBirbDatabase(
    'SubmissionFileSchema',
  );

  private readonly fileBufferRepository = new PostyBirbDatabase(
    'FileBufferSchema',
  );

  constructor(private readonly createFileService: CreateFileService) {}

  /**
   * Creates file entity and stores it.
   *
   * @param {MulterFileInfo} file
   * @param {MulterFileInfo} submission
   * @param {Buffer} buf
   * @param {string} target
   * @return {*}  {Promise<SubmissionFile>}
   */
  public async update(
    file: MulterFileInfo,
    submissionFileId: EntityId,
    buf: Buffer,
    target?: 'thumbnail',
  ): Promise<SubmissionFile> {
    const submissionFile = await this.findFile(submissionFileId);

    await withTransactionContext(this.fileRepository.db, async (ctx) => {
      if (target === 'thumbnail') {
        await this.replaceFileThumbnail(ctx, submissionFile, file, buf);
      } else {
        await this.replacePrimaryFile(ctx, submissionFile, file, buf);
      }
    });

    // Notify subscribers so SubmissionService emits a websocket update
    this.fileRepository.forceNotify([submissionFileId], 'update');
    this.fileBufferRepository.forceNotify([submissionFileId], 'update');

    // return the latest
    return this.findFile(submissionFileId);
  }

  private async replaceFileThumbnail(
    ctx: TransactionContext,
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    const thumbnailDetails = await this.getImageDetails(file, buf);
    let { thumbnailId } = submissionFile;

    if (!thumbnailId) {
      // Create a new thumbnail buffer entity
      const thumbnail = await this.createFileService.createFileBufferEntity(
        ctx,
        submissionFile,
        thumbnailDetails.buffer,
        {
          width: thumbnailDetails.width,
          height: thumbnailDetails.height,
          mimeType: file.mimetype,
        },
      );
      thumbnailId = thumbnail.id;
    } else {
      // Update existing thumbnail buffer
      await ctx
        .getDb()
        .update(this.fileBufferRepository.schemaEntity)
        .set({
          buffer: thumbnailDetails.buffer,
          size: thumbnailDetails.buffer.length,
          mimeType: file.mimetype,
          width: thumbnailDetails.width,
          height: thumbnailDetails.height,
        })
        .where(eq(this.fileBufferRepository.schemaEntity.id, thumbnailId));
    }

    // Recompute hash from thumbnail buffer so the frontend cache-buster updates
    const thumbnailHash = await hash(thumbnailDetails.buffer, {
      algorithm: 'sha256',
    });

    await ctx
      .getDb()
      .update(this.fileRepository.schemaEntity)
      .set({
        thumbnailId,
        hasCustomThumbnail: true,
        hasThumbnail: true,
        hash: thumbnailHash,
      })
      .where(eq(this.fileRepository.schemaEntity.id, submissionFile.id));
  }

  async replacePrimaryFile(
    ctx: TransactionContext,
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    return this.updateFileEntity(ctx, submissionFile, file, buf);
  }

  private async updateFileEntity(
    ctx: TransactionContext,
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    const fileHash = await hash(buf, { algorithm: 'sha256' });

    // Only need to replace when unique file is given
    if (submissionFile.hash !== fileHash) {
      const fileType = getFileType(file.filename);
      if (fileType === FileType.IMAGE) {
        await this.updateImageFileProps(ctx, submissionFile, file, buf);
      }

      // Update submission file entity
      await ctx
        .getDb()
        .update(this.fileRepository.schemaEntity)
        .set({
          hash: fileHash,
          size: buf.length,
          fileName: file.filename,
          mimeType: file.mimetype,
        })
        .where(eq(this.fileRepository.schemaEntity.id, submissionFile.id));

      // Just to get the latest data

      // Duplicate props to primary file
      await ctx
        .getDb()
        .update(this.fileBufferRepository.schemaEntity)
        .set({
          buffer: buf,
          size: buf.length,
          fileName: file.filename,
          mimeType: file.mimetype,
        })
        .where(
          eq(
            this.fileBufferRepository.schemaEntity.id,
            submissionFile.primaryFileId,
          ),
        );

      if (
        getFileType(file.originalname) === FileType.TEXT &&
        submissionFile.hasAltFile
      ) {
        const altFileText =
          (await this.repopulateTextFile(file, buf)) ||
          submissionFile?.altFile?.buffer;
        if (altFileText) {
          await ctx
            .getDb()
            .update(this.fileBufferRepository.schemaEntity)
            .set({
              buffer: altFileText,
              size: altFileText.length,
            })
            .where(
              eq(
                this.fileBufferRepository.schemaEntity.id,
                submissionFile.altFile.id,
              ),
            );
          await ctx
            .getDb()
            .update(this.fileRepository.schemaEntity)
            .set({
              hasAltFile: true,
            })
            .where(eq(this.fileRepository.schemaEntity.id, submissionFile.id));
        }
      }
    }
  }

  async repopulateTextFile(
    file: MulterFileInfo,
    buf: Buffer,
  ): Promise<Buffer | null> {
    let altText: string;
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx')
    ) {
      this.logger.info('[Mutation] Updating Alt File for Text Document: DOCX');
      altText = (await mammoth.convertToHtml({ buffer: buf })).value;
    }

    if (
      file.mimetype === 'application/rtf' ||
      file.originalname.endsWith('.rtf')
    ) {
      this.logger.info('[Mutation] Updating Alt File for Text Document: RTF');
      const promisifiedRtf = promisify(rtf.fromString);
      altText = await promisifiedRtf(buf.toString(), {
        template(_, __, content: string) {
          return content;
        },
      });
    }

    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      this.logger.info('[Mutation] Updating Alt File for Text Document: TXT');
      altText = buf.toString();
    }

    return altText
      ? Buffer.from(htmlBeautify(altText, { wrap_line_length: 120 }))
      : null;
  }

  private async updateImageFileProps(
    ctx: TransactionContext,
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer,
  ) {
    const { width, height, sharpInstance } = await this.getImageDetails(
      file,
      buf,
    );
    await ctx
      .getDb()
      .update(this.fileRepository.schemaEntity)
      .set({
        width,
        height,
      })
      .where(eq(this.fileRepository.schemaEntity.id, submissionFile.id));

    await ctx
      .getDb()
      .update(this.fileBufferRepository.schemaEntity)
      .set({
        width,
        height,
      })
      .where(
        eq(
          this.fileBufferRepository.schemaEntity.id,
          submissionFile.primaryFileId,
        ),
      );

    if (submissionFile.hasThumbnail && !submissionFile.hasCustomThumbnail) {
      // Regenerate auto-thumbnail;
      const {
        buffer: thumbnailBuf,
        width: thumbnailWidth,
        height: thumbnailHeight,
        mimeType: thumbnailMimeType,
      } = await this.createFileService.generateThumbnail(
        sharpInstance,
        height,
        width,
        file.mimetype,
      );

      const fileNameWithoutExt = parse(file.filename).name;
      const thumbnailExt = thumbnailMimeType === 'image/jpeg' ? 'jpg' : 'png';

      await ctx
        .getDb()
        .update(this.fileBufferRepository.schemaEntity)
        .set({
          buffer: thumbnailBuf,
          width: thumbnailWidth,
          height: thumbnailHeight,
          size: thumbnailBuf.length,
          mimeType: thumbnailMimeType,
          fileName: `thumbnail_${fileNameWithoutExt}.${thumbnailExt}`,
        })
        .where(
          eq(
            this.fileBufferRepository.schemaEntity.id,
            submissionFile.thumbnailId,
          ),
        );
    }
  }

  /**
   * Details of a multer file.
   *
   * @param {MulterFileInfo} file
   */
  private async getImageDetails(file: MulterFileInfo, buf: Buffer) {
    if (ImageUtil.isImage(file.mimetype, false)) {
      const sharpInstance = ImageUtil.load(buf);

      const { height, width } = await sharpInstance.metadata();
      return { buffer: buf, width, height, sharpInstance };
    }

    throw new BadRequestException('File is not an image');
  }

  /**
   * Returns file by Id.
   *
   * @param {EntityId} id
   */
  private async findFile(id: EntityId): Promise<SubmissionFile> {
    try {
      const entity = await this.fileRepository.findOne({
        where: (f, { eq: equals }) => equals(f.id, id),
        // !bug - https://github.com/drizzle-team/drizzle-orm/issues/3497
        // with: {
        //   thumbnail: true,
        //   primaryFile: true,
        //   altFile: true,
        // },
      });

      return entity;
    } catch (e) {
      this.logger.error(e.message, e.stack);
      throw new NotFoundException(id);
    }
  }
}
