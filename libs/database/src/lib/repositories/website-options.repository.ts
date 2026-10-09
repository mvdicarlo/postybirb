import { getDatabase } from '../database';
import { WebsiteOptions } from '../entities/website-options.entity';
import { WebsiteOptionsSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

/**
 * Default eager-load mirrors `WebsiteOptionsService` which always reads
 * account + submission alongside the options row.
 */
export class WebsiteOptionsRepository extends EntityRepository<
  'WebsiteOptionsSchema',
  WebsiteOptions
> {
  constructor() {
    super({
      schemaKey: 'WebsiteOptionsSchema',
      table: WebsiteOptionsSchema,
      query: getDatabase().query.WebsiteOptionsSchema,
      EntityClass: WebsiteOptions,
      defaultWith: { account: true, submission: true },
    });
  }
}
