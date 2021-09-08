import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { ACCOUNT_REPOSITORY, DATABASE_CONNECTION } from '../../constants';
import { Account } from '../models/account.model';

export const accountProvider: Provider = {
  provide: ACCOUNT_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(Account),
  inject: [DATABASE_CONNECTION],
};
