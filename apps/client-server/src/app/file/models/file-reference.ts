import { ParsedPath } from 'path';
import FileMetadata from './file-metadata';
import FileType from '../enums/file-type';

export default interface FileReference {
  id: string;
  localPath: string;
  metadata: FileMetadata;
  path: ParsedPath;
  type: FileType;
}
