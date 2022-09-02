import { FileType } from '@postybirb/types';
import { ParsedPath } from 'path';
import { MulterFileMetadata } from './multer-file-metadata';

export interface FileReference {
  id: string;
  localPath: string;
  metadata: MulterFileMetadata;
  path: ParsedPath;
  type: FileType;
}
