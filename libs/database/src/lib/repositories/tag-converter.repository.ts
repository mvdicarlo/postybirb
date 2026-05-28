import { TagConverter } from '../entities/tag-converter.entity';
import { getDatabase } from '../database';
import { TagConverterSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class TagConverterRepository extends EntityRepository<
  'TagConverterSchema',
  TagConverter
> {
  constructor() {
    super({
      schemaKey: 'TagConverterSchema',
      table: TagConverterSchema,
      query: getDatabase().query.TagConverterSchema,
      EntityClass: TagConverter,
    });
  }
}
