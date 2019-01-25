import { ITable, DATA_TYPE } from 'jsstore';

export interface IGeneratedThumbnail {
  id: string;
  submissionfileId: string; // fk to original file
  buffer: Uint8Array;
  type: string; // mime
}

const GeneratedThumbnailTable: ITable = {
  name: 'SubmissionFile',
  columns: [{
    name: 'id',
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'submissionfileId',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'type',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'buffer',
    notNull: true,
    dataType: DATA_TYPE.Array
  }]
}

export { GeneratedThumbnailTable }
