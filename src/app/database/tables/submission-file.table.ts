import { ITable, DATA_TYPE } from 'jsstore';

export interface FileObject {
  name: string;
  size: number;
  path: string;
  type: string; //mime
}

export function asFileObject(file: File): FileObject {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    path: file['path']
  };
}

export interface ISubmissionFile {
  id: number;
  submissionId: number; // fk to submission
  buffer: Blob;
  fileInfo: FileObject;
  fileType: SubmissionFileType;
}

export interface ISubmissionFileWithArray {
  id: number;
  submissionId: number; // fk to submission
  buffer: Uint8Array;
  fileInfo: FileObject;
  fileType: SubmissionFileType;
}

export enum SubmissionFileType {
  ADDITIONAL_FILE = 'ADDITIONAL',
  PRIMARY_FILE = 'PRIMARY',
  THUMBNAIL_FILE = 'THUMBNAIL'
}

const SubmissionFileTableName: string = 'SubmissionFile';

const SubmissionFileTable: ITable = {
  name: SubmissionFileTableName,
  columns: {
    id: {
      primaryKey: true,
      autoIncrement: true
    },
    submissionId: {
      notNull: true,
      dataType: DATA_TYPE.Number
    },
    fileInfo: {
      notNull: true,
      dataType: DATA_TYPE.Object
    },
    fileType: {
      notNull: true,
      dataType: DATA_TYPE.String
    },
    buffer: {
      notNull: true,
      dataType: DATA_TYPE.Object
    }
  }
};

export { SubmissionFileTable, SubmissionFileTableName }
