import { FormFile } from '@postybirb/http';
import {
  FileMetadataFields,
  FileType,
  IFileBuffer,
  SubmissionFileId,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';

export type ThumbnailOptions = Pick<
  IFileBuffer,
  'buffer' | 'height' | 'width' | 'mimeType' | 'fileName'
>;

export type FormDataFileFormat = {
  value: Buffer;
  options: {
    contentType: string;
    filename: string;
  };
};

export class PostingFile {
  public readonly id: SubmissionFileId;

  public readonly buffer: Buffer;

  public readonly mimeType: string;

  public readonly fileType: FileType;

  public readonly fileName: string;

  public readonly width: number;

  public readonly height: number;

  public metadata: FileMetadataFields;

  public readonly thumbnail?: ThumbnailOptions;

  public constructor(
    id: SubmissionFileId,
    file: IFileBuffer,
    thumbnail?: ThumbnailOptions,
  ) {
    this.id = id;
    this.buffer = file.buffer;
    this.mimeType = file.mimeType;
    this.width = file.width;
    this.height = file.height;
    this.fileType = getFileType(file.fileName);
    this.fileName = this.normalizeFileName(file);
    this.thumbnail = thumbnail;
  }

  private normalizeFileName(file: IFileBuffer): string {
    const { ext } = parse(file.fileName);
    return `${file.id}${ext}`;
  }

  public withMetadata(metadata: FileMetadataFields): PostingFile {
    this.metadata = metadata;
    return this;
  }

  public toPostFormat(): FormFile {
    return new FormFile(this.buffer, {
      contentType: this.mimeType,
      filename: this.fileName,
    });
  }

  public thumbnailToPostFormat(): FormFile | undefined {
    if (!this.thumbnail) {
      return undefined;
    }

    return new FormFile(this.thumbnail.buffer, {
      contentType: this.thumbnail.mimeType,
      filename: this.thumbnail.fileName,
    });
  }
}
