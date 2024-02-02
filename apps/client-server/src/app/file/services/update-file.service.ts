/* eslint-disable no-param-reassign */
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { FileType } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { async as hash } from 'hasha';
import { SubmissionFile } from '../../database/entities';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { MulterFileInfo } from '../models/multer-file-info';
import { ImageUtil } from '../utils/image.util';
import { CreateFileService } from './create-file.service';
import { IsTestEnvironment } from '../../utils/test.util';

/**
 * A Service for updating existing SubmissionFile entities.
 */
@Injectable()
export class UpdateFileService {
  private readonly logger = Logger();

  constructor(
    private readonly createFileService: CreateFileService,
    @InjectRepository(SubmissionFile)
    private readonly fileRepository: PostyBirbRepository<SubmissionFile>
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
  public async update(
    file: MulterFileInfo,
    submissionFileId: string,
    buf: Buffer,
    target?: 'thumbnail'
  ): Promise<SubmissionFile> {
    const submissionFile = await this.findFile(submissionFileId);
    if (target === 'thumbnail') {
      await this.replaceFileThumbnail(submissionFile, file, buf);
    } else {
      await this.replacePrimaryFile(submissionFile, file, buf);
    }

    return submissionFile;
  }

  private async replaceFileThumbnail(
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer
  ) {
    const thumbnailDetails = await this.getImageDetails(file, buf);
    if (!submissionFile.thumbnail) {
      submissionFile.thumbnail = this.createFileService.createFileBufferEntity(
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

  async replacePrimaryFile(
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer
  ) {
    await this.updateFileEntity(submissionFile, file, buf);
    await this.fileRepository.persistAndFlush(submissionFile);
  }

  private async updateFileEntity(
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer
  ): Promise<void> {
    const fileHash = await hash(buf, { algorithm: 'sha256' });

    // Only need to replace when unique file is given
    if (submissionFile.hash !== fileHash) {
      const fileType = getFileType(file.filename);
      if (fileType === FileType.IMAGE) {
        await this.updateImageFileProps(submissionFile, file, buf);
      }

      // Update submission file entity
      submissionFile.size = buf.length;
      submissionFile.fileName = file.filename;
      submissionFile.mimeType = file.mimetype;
      submissionFile.hash = fileHash;

      // Duplicate props to primary file
      submissionFile.file.buffer = buf;
      submissionFile.file.fileName = submissionFile.fileName;
      submissionFile.file.mimeType = submissionFile.mimeType;
      submissionFile.file.width = submissionFile.width;
      submissionFile.file.height = submissionFile.height;
    }
  }

  private async updateImageFileProps(
    submissionFile: SubmissionFile,
    file: MulterFileInfo,
    buf: Buffer
  ) {
    const { width, height, sharpInstance } = await this.getImageDetails(
      file,
      buf
    );
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
      } = await this.createFileService.generateThumbnail(
        sharpInstance,
        height,
        width
      );
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
  private async getImageDetails(file: MulterFileInfo, buf: Buffer) {
    if (ImageUtil.isImage(file.mimetype, false)) {
      const sharpInstance = ImageUtil.load(buf);

      if (IsTestEnvironment()) {
        return {
          height: 100,
          width: 100,
          buffer: buf,
          sharpInstance,
        };
      }

      const { height, width } = await sharpInstance.metadata();
      return { buffer: buf, width, height, sharpInstance };
    }

    throw new BadRequestException('File is not an image');
  }

  /**
   * Returns file by Id.
   *
   * @param {string} id
   */
  private async findFile(id: string): Promise<SubmissionFile> {
    try {
      const entity = await this.fileRepository.findOneOrFail(
        { id },
        { populate: true }
      );

      return entity;
    } catch (e) {
      this.logger.error(e.message, e.stack);
      throw new NotFoundException(id);
    }
  }
}
