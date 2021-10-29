import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DATABASE_CONNECTION, FILE_REPOSITORY } from '../../constants';
import { File } from '../entities/file.entity';

export const FileProvider: Provider = {
  provide: FILE_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(File),
  inject: [DATABASE_CONNECTION],
};
