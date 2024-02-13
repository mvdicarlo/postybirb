import { FileType } from '@postybirb/types';

export type PostingFile = {
  buffer: Buffer;
  mimeType: string;
  fileType: FileType;
  fileName: string;
  id: string;
};
