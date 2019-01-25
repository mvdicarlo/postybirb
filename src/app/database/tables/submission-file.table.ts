import { ITable, DATA_TYPE } from 'jsstore';

export interface ISubmissionFile {
  id: string;
  submissionId: string; // fk to submission
  buffer: Uint8Array;
  type: string; // mime
  size: number;
  name: string;
  fileType: SubmissionFileType;
}

export enum SubmissionFileType {
  ADDITIONAL_FILE = 'ADDITIONAL',
  PRIMARY_FILE = 'PRIMARY',
  THUMBNAIL = 'THUMBNAIL'
}

const SubmissionFileTable: ITable = {
  name: 'SubmissionFile',
  columns: [{
    name: 'id',
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'submissionId',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'name',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'type',
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
    dataType: DATA_TYPE.Array
  }]
}

export { SubmissionFileTable }
