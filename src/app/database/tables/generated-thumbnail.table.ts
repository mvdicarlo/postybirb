import { ITable, DATA_TYPE } from 'jsstore';

export interface IGeneratedThumbnail {
  id: number;
  submissionFileId: number; // fk to original file
  buffer: Uint8Array;
  type: string; // mime
}

const GeneratedThumbnailTableName: string = 'GeneratedThumbnail';

const GeneratedThumbnailTable: ITable = {
  name: GeneratedThumbnailTableName,
  columns: [{
    name: 'id',
    primaryKey: true,
    autoIncrement: true
  }, {
    name: 'submissionFileId',
    notNull: true,
    dataType: DATA_TYPE.Number
  }, {
    name: 'type',
    notNull: true,
    dataType: DATA_TYPE.String
  }, {
    name: 'buffer',
    notNull: true,
    dataType: DATA_TYPE.Object
  }]
}

export { GeneratedThumbnailTable, GeneratedThumbnailTableName }
