import { getDatabase } from '../database';
import { WebsiteData } from '../entities/website-data.entity';
import { WebsiteDataSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class WebsiteDataRepository extends EntityRepository<
  'WebsiteDataSchema',
  WebsiteData
> {
  constructor() {
    super({
      schemaKey: 'WebsiteDataSchema',
      table: WebsiteDataSchema,
      query: getDatabase().query.WebsiteDataSchema,
      EntityClass: WebsiteData,
    });
  }
}
