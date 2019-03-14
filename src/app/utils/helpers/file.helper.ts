import { ISubmissionFile } from 'src/app/database/tables/submission-file.table';

export function isGIF(file: { type: string }): boolean {
  return isImage(file) && isType(file, 'gif');
}

export function isImage(file: { type: string }): boolean {
  return file.type.includes('image');
}

export function isType(file: { type: string }, type: string): boolean {
  return file.type.includes(type);
}

export function MBtoBytes(size: any): number {
  return Number(size) * (1024 ** 2);
}

export function fileAsFormDataObject(file: ISubmissionFile): any {
  return file ? {
        value: Buffer.from(file.buffer),
        options: {
          contentType: file.fileInfo.type,
          filename: (file.fileInfo || <any>{}).name || 'upload.jpg'
        }
      } : '';
}

export function fileAsBlob(file: ISubmissionFile): Blob {
  return new Blob([file.buffer], { type: file.fileInfo.type });
}
