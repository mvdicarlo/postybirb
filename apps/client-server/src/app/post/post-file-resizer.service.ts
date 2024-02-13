import { wrap } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { ISubmissionFile } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { cpus } from 'os';
import { parse } from 'path';
import { Sharp } from 'sharp';
import { ImageUtil } from '../file/utils/image.util';
import { ImageResizeProps } from './models/image-resize-props';
import { PostingFile } from './models/posting-file';

type ResizeRequest = {
  file: ISubmissionFile;
  resize: ImageResizeProps;
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
      Math.min(cpus().length, 4)
    );

  public async resize(request: ResizeRequest): Promise<PostingFile> {
    return this.queue.push(request);
  }

  private async process(request: ResizeRequest): Promise<PostingFile> {
    const { file, resize } = request;
    await wrap(file).init(true, ['file']); // ensure primary file is loaded
    let sharpInstance = ImageUtil.load(file.file.buffer);
    let hasBeenModified = false;
    if (resize.width || resize.height) {
      // Check if resizing is even worth it
      if (resize.width < file.file.width || resize.height < file.file.height) {
        hasBeenModified = true;
        sharpInstance = await this.resizeImage(
          sharpInstance,
          resize.width,
          resize.height
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
          file.mimeType
        );
      }
    }

    if (hasBeenModified) {
      return {
        buffer: await sharpInstance.toBuffer(),
        fileName: this.normalizeFileName(file),
        fileType: getFileType(file.fileName),
        id: file.id,
        mimeType: file.mimeType,
      };
    }

    return {
      buffer: file.file.buffer,
      fileName: this.normalizeFileName(file),
      fileType: getFileType(file.fileName),
      id: file.id,
      mimeType: file.mimeType,
    };
  }

  private normalizeFileName(file: ISubmissionFile): string {
    const { ext } = parse(file.fileName);
    return `${file.id}${ext}`;
  }

  private async resizeImage(instance: Sharp, width: number, height: number) {
    const metadata = await instance.metadata();
    if (metadata.width > width || metadata.height > height) {
      return ImageUtil.load(
        await instance.resize({ width, height, fit: 'inside' }).toBuffer()
      );
    }
    return instance;
  }

  private async scaleDownImage(
    instance: Sharp,
    maxBytes: number,
    allowQualityLoss: boolean,
    mimeType: string
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
      const resizePercent = counter * 0.05;
      if (resizePercent >= 1) {
        break;
      }

      s = await this.resizeImage(
        instance,
        metadata.width * resizePercent,
        metadata.height * resizePercent
      );
    }

    if (await this.isFileTooLarge(s, maxBytes)) {
      throw new Error(
        'Image is still too large after scaling down. Try scaling down the image manually.'
      );
    }

    return s;
  }

  private async isFileTooLarge(instance: Sharp, maxBytes: number) {
    return (await instance.toBuffer()).length > maxBytes;
  }
}
