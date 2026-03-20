import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  FileType,
  IFileBuffer,
  ImageResizeProps,
  ISubmissionFile,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { SharpInstanceManager } from '../../../image-processing/sharp-instance-manager';
import { PostingFile, ThumbnailOptions } from '../../models/posting-file';

type ResizeRequest = {
  file: ISubmissionFile;
  resize?: ImageResizeProps;
};

/**
 * Responsible for resizing an image file to a smaller size before
 * posting to a website.
 *
 * All sharp/libvips work is delegated to the SharpInstanceManager,
 * which runs sharp in isolated worker threads. If libvips crashes
 * (e.g. after long idle), only the worker dies — the main process
 * survives.
 *
 * @class PostFileResizer
 */
@Injectable()
export class PostFileResizerService {
  private readonly logger = Logger();

  constructor(
    private readonly sharpInstanceManager: SharpInstanceManager,
  ) {}

  public async resize(request: ResizeRequest): Promise<PostingFile> {
    return this.process(request);
  }

  private async process(request: ResizeRequest): Promise<PostingFile> {
    const { resize } = request;
    const { file } = request;
    this.logger.withMetadata({ resize }).info('Resizing image...');

    if (!file.file) {
      throw new Error('File buffer is missing');
    }

    const primaryFile = await this.processPrimaryFile(file, resize);
    const thumbnail = await this.processThumbnailFile(file);

    const newPostingFile = new PostingFile(
      file.id,
      primaryFile,
      thumbnail,
    );

    newPostingFile.metadata = file.metadata;
    return newPostingFile;
  }

  private async processPrimaryFile(
    file: ISubmissionFile,
    resize?: ImageResizeProps,
  ): Promise<IFileBuffer> {
    if (!resize) return file.file;

    const result = await this.sharpInstanceManager.resizeForPost({
      buffer: file.file.buffer,
      resize,
      mimeType: file.mimeType,
      fileName: file.fileName,
      fileId: file.id,
      fileWidth: file.file.width,
      fileHeight: file.file.height,
      generateThumbnail: false,
    });

    if (result.modified && result.buffer) {
      return {
        ...file.file,
        fileName: result.fileName || `${file.id}.${result.format}`,
        buffer: result.buffer,
        mimeType: result.mimeType || file.mimeType,
        height: result.height || file.file.height,
        width: result.width || file.file.width,
      };
    }

    return file.file;
  }

  private async processThumbnailFile(
    file: ISubmissionFile,
  ): Promise<ThumbnailOptions | undefined> {
    let thumb = file.thumbnail;
    const shouldProcessThumbnail =
      !!thumb || getFileType(file.fileName) === FileType.IMAGE;

    if (!shouldProcessThumbnail) {
      return undefined;
    }

    thumb = thumb ?? { ...file.file }; // Ensure file to process

    const result = await this.sharpInstanceManager.generateThumbnail(
      thumb.buffer,
      thumb.mimeType,
      thumb.fileName,
      500,
    );

    return {
      buffer: result.buffer,
      fileName: thumb.fileName,
      mimeType: thumb.mimeType,
      height: result.height,
      width: result.width,
    };
  }
}
