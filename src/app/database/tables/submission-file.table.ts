import { ITable, DATA_TYPE } from 'jsstore';

export interface ISubmissionFile {
  id: number;
  submissionId: number; // fk to submission
  buffer: Uint8Array;
  type: string; // mime
  size: number;
  name: string;
  path: string;
  fileType: SubmissionFileType;
}

export enum SubmissionFileType {
  ADDITIONAL_FILE = 'ADDITIONAL',
  PRIMARY_FILE = 'PRIMARY',
  THUMBNAIL = 'THUMBNAIL'
}

const SubmissionFileTableName: string = 'SubmissionFile';

const SubmissionFileTable: ITable = {
  name: SubmissionFileTableName,
  columns: [{
    name: 'id',
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'submissionId',
    notNull: true,
    dataType: DATA_TYPE.Number
  }, {
    name: 'name',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'type',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'path',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'size',
    notNull: true,
    dataType: DATA_TYPE.Number
  }, {
    name: 'fileType',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'buffer',
    notNull: true,
    dataType: DATA_TYPE.Object
  }]
}

export { SubmissionFileTable, SubmissionFileTableName }
