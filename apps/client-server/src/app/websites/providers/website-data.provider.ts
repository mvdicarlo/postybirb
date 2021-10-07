import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DATABASE_CONNECTION, WEBSITE_DATA_REPOSITORY } from '../../constants';
import { WebsiteData } from '../entities/website-data.entity';

export const websiteDataProvider: Provider = {
  provide: WEBSITE_DATA_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(WebsiteData),
  inject: [DATABASE_CONNECTION],
};
