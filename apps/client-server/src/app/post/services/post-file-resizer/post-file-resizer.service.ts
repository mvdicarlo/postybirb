import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  FileType,
  IFileBuffer,
  ImageResizeProps,
  ISubmissionFile,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { cpus } from 'os';
import { parse } from 'path';
import { Sharp } from 'sharp';
import { ImageUtil } from '../../../file/utils/image.util';
import { PostingFile, ThumbnailOptions } from '../../models/posting-file';

type ResizeRequest = {
  file: ISubmissionFile;
  resize?: ImageResizeProps;
};

/**
 * Responsible for resizing an image file to a smaller size before
 * posting to a website.
 * @class PostFileResizer
 */
@Injectable()
export class PostFileResizerService {
  private readonly logger = Logger();

  private readonly queue: queueAsPromised<ResizeRequest, PostingFile> =
    fastq.promise<this, ResizeRequest>(
      this,
      this.process,
      Math.min(cpus().length, 4),
    );

  public async resize(request: ResizeRequest): Promise<PostingFile> {
    return this.queue.push(request);
  }

  private async process(request: ResizeRequest): Promise<PostingFile> {
    const { resize } = request;
    const { file } = request;
    this.logger.withMetadata({ resize }).info('Resizing image...');

    if (!file.file) {
      throw new Error('File buffer is missing');
    }

    const newPostingFile = new PostingFile(
      file.id,
      await this.processPrimaryFile(file, resize),
      await this.processThumbnailFile(file),
    );

    newPostingFile.metadata = file.metadata;
    return newPostingFile;
  }

  private async processPrimaryFile(
    file: ISubmissionFile,
    resize?: ImageResizeProps,
  ): Promise<IFileBuffer> {
    if (!resize) return file.file;

    let sharpInstance = ImageUtil.load(file.file.buffer);
    let hasBeenModified = false;
    if (resize.width || resize.height) {
      // Check if resizing is even worth it
      if (resize.width < file.file.width || resize.height < file.file.height) {
        hasBeenModified = true;
        sharpInstance = await this.resizeImage(
          sharpInstance,
          resize.width,
          resize.height,
        );
      }
    }

    if (resize.maxBytes && file.file.buffer.length > resize.maxBytes) {
      if (this.isFileTooLarge(sharpInstance, resize.maxBytes)) {
        hasBeenModified = true;
        sharpInstance = await this.scaleDownImage(
          sharpInstance,
          resize.maxBytes,
          resize.allowQualityLoss,
          file.mimeType,
        );
      }
    }

    if (hasBeenModified) {
      const m = await sharpInstance.metadata();
      return {
        ...file.file,
        fileName: `${file.id}.${m.format}`,
        buffer: await sharpInstance.toBuffer(),
        mimeType: `image/${m.format}`,
        height: m.height,
        width: m.width,
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

    let instance = ImageUtil.load(thumb.buffer);
    let width: number;
    let height: number;
    const metadata = await instance.metadata();
    // Chose the larger dimension to scale down
    if (metadata.width >= metadata.height) {
      width = 500;
    } else {
      height = 500;
    }
    instance = await this.resizeImage(instance, width, height);
    const extension = metadata.hasAlpha ? '.png' : '.jpeg';
    if (metadata.hasAlpha) {
      instance = instance.png();
    } else {
      instance = instance.jpeg({ quality: 99 });
    }

    ({ width, height } = await instance.metadata());
    const { name } = parse(thumb.fileName);
    return {
      buffer: await instance.toBuffer(),
      fileName: `${name}${extension}`,
      mimeType: thumb.mimeType,
      height,
      width,
    };
  }

  private async resizeImage(instance: Sharp, width: number, height: number) {
    const metadata = await instance.metadata();
    this.logger.withMetadata({ width, height, metadata }).info('Resizing');
    if (metadata.width > width || metadata.height > height) {
      return ImageUtil.load(
        await instance.resize({ width, height, fit: 'inside' }).toBuffer(),
      );
    }
    return instance;
  }

  private async scaleDownImage(
    instance: Sharp,
    maxBytes: number,
    allowQualityLoss: boolean,
    mimeType: string,
  ) {
    let s = instance;
    const metadata = await instance.metadata();
    // If PNG and no alpha channel, convert to JPEG
    if (mimeType === 'image/png' && !metadata.hasAlpha) {
      // eslint-disable-next-line no-param-reassign
      mimeType = 'image/jpeg';
      s = s.jpeg({ quality: 100 });
    }

    if (
      mimeType === 'image/jpeg' &&
      allowQualityLoss &&
      (await this.isFileTooLarge(s, maxBytes))
    ) {
      s = s.jpeg({ quality: 98 });
    }

    let counter = 0;
    while (await this.isFileTooLarge(s, maxBytes)) {
      counter += 1;
      const resizePercent = 1 - counter * 0.05;
      if (resizePercent <= 0.1) break;

      s = await this.resizeImage(
        instance, // scale against original only
        Math.round(metadata.width * resizePercent),
        Math.round(metadata.height * resizePercent),
      );

      if (!(await this.isFileTooLarge(s, maxBytes))) return s;
    }

    if (await this.isFileTooLarge(s, maxBytes)) {
      throw new Error(
        'Image is still too large after scaling down. Try scaling down the image manually.',
      );
    }

    return s;
  }

  private async isFileTooLarge(instance: Sharp, maxBytes: number) {
    return (await instance.toBuffer()).length > maxBytes;
  }
}
