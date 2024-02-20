import { FileType, ISubmissionFile } from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';

export class PostingFile {
  public readonly buffer: Buffer;

  public readonly mimeType: string;

  public readonly fileType: FileType;

  public readonly fileName: string;

  public readonly id: string;

  public constructor(file: ISubmissionFile, buffer?: Buffer) {
    this.buffer = buffer ?? file.file.buffer;
    this.mimeType = file.mimeType;
    this.fileType = getFileType(file.fileName);
    this.fileName = this.normalizeFileName(file);
    this.id = file.id;
  }

  private normalizeFileName(file: ISubmissionFile): string {
    const { ext } = parse(file.fileName);
    return `${file.id}${ext}`;
  }
}
