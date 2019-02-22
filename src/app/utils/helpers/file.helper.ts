import { FileObject } from 'src/app/database/tables/submission-file.table';

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
  return Number(size) * Math.pow(1024, 2);
}

export function fileAsFormDataObject(buffer: Uint8Array, fileInfo: FileObject): any {
  return buffer ? {
        value: Buffer.from(buffer),
        options: {
          contentType: fileInfo.type,
          filename: (fileInfo || <any>{}).name || 'upload.jpg'
        }
      } : null
}
