import { FileType, IFileBuffer } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';

export type ThumbnailOptions = {
  buffer: Buffer;
  fileName: string;
};

export class PostingFile {
  public readonly buffer: Buffer;

  public readonly mimeType: string;

  public readonly fileType: FileType;

  public readonly fileName: string;

  public readonly id: string;

  public readonly thumbnail?: ThumbnailOptions;

  public constructor(file: IFileBuffer, thumbnail?: ThumbnailOptions) {
    this.buffer = file.buffer;
    this.mimeType = file.mimeType;
    this.fileType = getFileType(file.fileName);
    this.fileName = this.normalizeFileName(file);
    this.id = file.id;
    this.thumbnail = thumbnail;
  }

  private normalizeFileName(file: IFileBuffer): string {
    const { ext } = parse(file.fileName);
    return `${file.id}${ext}`;
  }
}
