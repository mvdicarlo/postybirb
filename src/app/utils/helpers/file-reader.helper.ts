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
  formData?: any;
}

export async function readFileMetadata(file: File, withMetadata: boolean = true): Promise<FileMetadata> {
  const data: any = {
    file,
    buffer: new Uint8Array(await new Response(file).arrayBuffer()),
    title: (file['name'] || '').replace('_', ' ').split('.').shift(),
    isImage: isImage(file),
    isGIF: isGIF(file)
  };

  if (withMetadata && data.isImage && !data.isGIF) {
    const ni = nativeImage.createFromBuffer(Buffer.from(data.buffer));
    const size = ni.getSize();
    data.originalWidth = size.width;
    data.originalHeight = size.height;
    data.width = size.width;
    data.height = size.height;
  }

  return data;
}
