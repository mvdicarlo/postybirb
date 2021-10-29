import { FileData } from '../entities/file-data.entity';

export interface IFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  height: number;
  width: number;
  // @todo figure out types
  modifiers: any[];
  thumbnail: Promise<IFile | undefined>;
  data: Promise<FileData>; // Promise for lazy loading
}
