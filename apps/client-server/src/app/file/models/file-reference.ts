import { ParsedPath } from 'path';
import MulterFileMetadata from './multer-file-metadata';
import FileType from '../enums/file-type';

export default interface FileReference {
  id: string;
  localPath: string;
  metadata: MulterFileMetadata;
  path: ParsedPath;
  type: FileType;
}
