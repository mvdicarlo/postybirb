import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DATABASE_CONNECTION, FILE_DATA_REPOSITORY } from '../../constants';
import { FileData } from '../entities/file-data.entity';

export const FileDataProvider: Provider = {
  provide: FILE_DATA_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(FileData),
  inject: [DATABASE_CONNECTION],
};
