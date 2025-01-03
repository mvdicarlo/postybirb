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

  public toPostFormat(): FormDataFileFormat {
    return {
      value: this.buffer,
      options: {
        contentType: this.mimeType,
        filename: this.fileName,
      },
    };
  }

  public thumbnailToPostFormat(): FormDataFileFormat | undefined {
    if (!this.thumbnail) {
      return undefined;
    }

    return {
      value: this.thumbnail.buffer,
      options: {
        contentType: this.thumbnail.mimeType,
        filename: this.thumbnail.fileName,
      },
    };
  }
}
