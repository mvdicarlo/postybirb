import { isGIF, isImage } from './file.helper';

export interface FileMetadata {
  buffer: Uint8Array,
  file: File
  title?: string;
  rating?: string;
  schedule?: Date;
  height?: number;
  width?: number;
  originalWidth?: number;
  originalHeight?: number;
  isImage?: boolean;
  isGIF?: boolean;
  canResize?: boolean;
  formData?: any;
}

export async function readFileMetadata(file: File): Promise<FileMetadata> {
  const data: any = {
    file,
    buffer: new Uint8Array(await new Response(file).arrayBuffer()),
    title: (file['name'] || '').replace('_', ' ').split('.').shift().substring(0, 50),
    isImage: isImage(file),
    isGIF: isGIF(file)
  };

  return data;
}
